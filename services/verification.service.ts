import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/auth";
import { userRepository } from "@/repositories/user.repository";
import { verificationRepository } from "@/repositories/verification.repository";
import { sendVerificationOtpEmail } from "@/lib/email";
import { sendWelcomeEmail } from "@/services/emailService";
import { RegisterInput } from "@/types";

const OTP_EXPIRY_MINUTES = 10;
const RESEND_COOLDOWN_SECONDS = 60;

function getOtpSecret(): string {
  const secret = process.env.OTP_HASH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "MISSING_OTP_HASH_SECRET: OTP_HASH_SECRET environment variable is required in production."
      );
    }
    return "pharmaloop-dev-otp-secret-2026";
  }
  return secret;
}

/**
 * Generates a cryptographically secure 6-digit OTP using crypto.randomInt
 */
export function generateOtp(): string {
  return crypto.randomInt(0, 1000000).toString().padStart(6, "0");
}

/**
 * Hashes the 6-digit OTP using HMAC-SHA256
 */
export function hashOtp(otp: string): string {
  const secret = getOtpSecret();
  return crypto.createHmac("sha256", secret).update(otp).digest("hex");
}

/**
 * Constant-time comparison of candidate OTP against stored hash
 */
export function verifyOtpHash(inputOtp: string, expectedHash: string): boolean {
  try {
    const secret = getOtpSecret();
    const inputHash = crypto.createHmac("sha256", secret).update(inputOtp).digest("hex");
    const inputBuffer = Buffer.from(inputHash, "hex");
    const expectedBuffer = Buffer.from(expectedHash, "hex");

    if (inputBuffer.length !== expectedBuffer.length) {
      return false;
    }
    return crypto.timingSafeEqual(inputBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

export const verificationService = {
  /**
   * Validates signup details, hashes the password and secure OTP,
   * dispatches the real OTP email, and persists pending verification state.
   * Zero permanent User record is created until OTP verification succeeds.
   */
  async initiateRegistration(input: RegisterInput): Promise<{ requiresVerification: true; email: string }> {
    const normalizedEmail = input.email.toLowerCase().trim();
    const trimmedPhone = input.phone?.trim() || undefined;

    const existingUser = await userRepository.findByEmail(normalizedEmail);
    if (existingUser) {
      throw new Error("EMAIL_ALREADY_REGISTERED");
    }

    if (trimmedPhone) {
      const existingPhone = await prisma.user.findUnique({
        where: { phone: trimmedPhone },
      });
      if (existingPhone) {
        throw new Error("PHONE_ALREADY_REGISTERED");
      }
    }

    const pending = await verificationRepository.findByEmail(normalizedEmail);
    if (pending && !pending.isConsumed) {
      // Atomic cooldown claim prevents concurrent resend bypass
      const claimed = await verificationRepository.claimResendCooldown(
        pending.id,
        RESEND_COOLDOWN_SECONDS,
      );
      if (!claimed) {
        const elapsedSeconds = (Date.now() - pending.lastSentAt.getTime()) / 1000;
        const remaining = Math.max(
          1,
          Math.ceil(RESEND_COOLDOWN_SECONDS - elapsedSeconds),
        );
        throw new Error(`RESEND_COOLDOWN:${remaining}`);
      }
    }

    const passwordHash = await bcrypt.hash(input.password, 12);
    const otp = generateOtp();
    const otpHash = hashOtp(otp);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await sendVerificationOtpEmail({
      to: normalizedEmail,
      name: input.name.trim(),
      otp,
    });

    await verificationRepository.upsertPending({
      email: normalizedEmail,
      name: input.name.trim(),
      phone: trimmedPhone,
      passwordHash,
      otpHash,
      expiresAt,
      lastSentAt: now,
    });

    return {
      requiresVerification: true,
      email: normalizedEmail,
    };
  },

  /**
   * Resends a new OTP for an existing pending registration after enforcing the 60-second cooldown.
   */
  async resendOtp(email: string): Promise<{ success: boolean; message: string }> {
    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await userRepository.findByEmail(normalizedEmail);
    if (existingUser) {
      throw new Error("EMAIL_ALREADY_REGISTERED");
    }

    const pending = await verificationRepository.findByEmail(normalizedEmail);
    if (!pending || pending.isConsumed) {
      throw new Error("NO_PENDING_REGISTRATION");
    }

    const claimed = await verificationRepository.claimResendCooldown(
      pending.id,
      RESEND_COOLDOWN_SECONDS,
    );
    if (!claimed) {
      const elapsedSeconds = (Date.now() - pending.lastSentAt.getTime()) / 1000;
      const remaining = Math.max(
        1,
        Math.ceil(RESEND_COOLDOWN_SECONDS - elapsedSeconds),
      );
      throw new Error(`RESEND_COOLDOWN:${remaining}`);
    }

    const newOtp = generateOtp();
    const newOtpHash = hashOtp(newOtp);
    const now = new Date();
    const newExpiresAt = new Date(now.getTime() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await sendVerificationOtpEmail({
      to: normalizedEmail,
      name: pending.name || undefined,
      otp: newOtp,
    });

    await verificationRepository.updateOtp(pending.id, newOtpHash, newExpiresAt, now);

    return {
      success: true,
      message: "A new verification code has been sent to your email.",
    };
  },

  /**
   * Validates the OTP against the pending verification record.
   * Attempt counting is enforced atomically so concurrent requests cannot
   * bypass the 5-attempt lockout (TOCTOU-safe).
   */
  async verifyAndCreateUser(email: string, inputOtp: string) {
    const normalizedEmail = email.toLowerCase().trim();

    const pending = await verificationRepository.findByEmail(normalizedEmail);
    if (!pending || pending.isConsumed || !pending.name || !pending.passwordHash) {
      throw new Error("INVALID_OR_CONSUMED_OTP");
    }

    if (new Date() > pending.expiresAt) {
      throw new Error("OTP_EXPIRED");
    }

    // Atomic attempt claim — concurrent wrong OTPs cannot bypass maxAttempts
    const claimed = await verificationRepository.claimAttemptAtomic(pending.id);
    if (!claimed) {
      const fresh = await verificationRepository.findByEmail(normalizedEmail);
      if (!fresh || fresh.isConsumed) {
        throw new Error("INVALID_OR_CONSUMED_OTP");
      }
      if (new Date() > fresh.expiresAt) {
        throw new Error("OTP_EXPIRED");
      }
      throw new Error("MAX_ATTEMPTS_EXCEEDED");
    }

    const isValid = verifyOtpHash(inputOtp, claimed.otpHash);
    if (!isValid) {
      const remaining = Math.max(0, claimed.maxAttempts - claimed.attempts);
      if (remaining === 0) {
        throw new Error("MAX_ATTEMPTS_EXCEEDED");
      }
      throw new Error(`INVALID_OTP:${remaining}`);
    }

    const user = await prisma.$transaction(async (tx) => {
      const raceCheck = await tx.user.findUnique({
        where: { email: normalizedEmail },
      });
      if (raceCheck) {
        throw new Error("EMAIL_ALREADY_REGISTERED");
      }

      if (claimed.phone) {
        const phoneRace = await tx.user.findUnique({
          where: { phone: claimed.phone },
        });
        if (phoneRace) {
          throw new Error("PHONE_ALREADY_REGISTERED");
        }
      }

      const createdUser = await tx.user.create({
        data: {
          name: claimed.name!,
          email: normalizedEmail,
          phone: claimed.phone || undefined,
          password: claimed.passwordHash!,
          role: "CUSTOMER",
          emailVerifiedAt: new Date(),
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          emailVerifiedAt: true,
          createdAt: true,
        },
      });

      await tx.emailVerification.update({
        where: { id: claimed.id },
        data: { isConsumed: true },
      });

      return createdUser;
    });

    const token = signToken(user.id, user.role);

    // Non-blocking welcome email side effect
    sendWelcomeEmail({
      to: user.email,
      name: user.name,
    }).catch((err) => {
      console.warn("[VerificationService] Welcome email dispatch warning:", err);
    });

    return { user, token };
  },
};
