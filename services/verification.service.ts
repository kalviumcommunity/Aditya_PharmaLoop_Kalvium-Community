import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/auth";
import { userRepository } from "@/repositories/user.repository";
import { verificationRepository } from "@/repositories/verification.repository";
import { sendVerificationOtpEmail } from "@/lib/email";
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

    // 1. Check if email or phone is already registered in User table
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

    // 2. Check for an active pending verification and enforce 60-second resend cooldown if recently sent
    const pending = await verificationRepository.findByEmail(normalizedEmail);
    if (pending && !pending.isConsumed) {
      const elapsedSeconds = (Date.now() - pending.lastSentAt.getTime()) / 1000;
      if (elapsedSeconds < RESEND_COOLDOWN_SECONDS) {
        const remaining = Math.ceil(RESEND_COOLDOWN_SECONDS - elapsedSeconds);
        throw new Error(`RESEND_COOLDOWN:${remaining}`);
      }
    }

    // 3. Hash password using bcrypt (12 salt rounds)
    const passwordHash = await bcrypt.hash(input.password, 12);

    // 4. Generate cryptographically secure 6-digit OTP & HMAC-SHA256 hash
    const otp = generateOtp();
    const otpHash = hashOtp(otp);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + OTP_EXPIRY_MINUTES * 60 * 1000);

    // 5. Send real OTP email FIRST.
    // If sending fails (e.g. SMTP unconfigured or auth failed), an error is thrown
    // and no cooldown is imposed on the user.
    await sendVerificationOtpEmail({
      to: normalizedEmail,
      name: input.name.trim(),
      otp,
    });

    // 6. Only persist pending verification record after email was successfully dispatched
    await verificationRepository.upsertPending({
      email: normalizedEmail,
      name: input.name.trim(),
      phone: trimmedPhone,
      passwordHash,
      otpHash,
      expiresAt,
      lastSentAt: now,
    });

    // 7. Return safe confirmation (OTP, password, and internal secrets are NEVER returned)
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

    // 1. If user is already registered, reject
    const existingUser = await userRepository.findByEmail(normalizedEmail);
    if (existingUser) {
      throw new Error("EMAIL_ALREADY_REGISTERED");
    }

    // 2. Locate pending verification
    const pending = await verificationRepository.findByEmail(normalizedEmail);
    if (!pending || pending.isConsumed) {
      throw new Error("NO_PENDING_REGISTRATION");
    }

    // 3. Enforce 60s cooldown
    const elapsedSeconds = (Date.now() - pending.lastSentAt.getTime()) / 1000;
    if (elapsedSeconds < RESEND_COOLDOWN_SECONDS) {
      const remaining = Math.ceil(RESEND_COOLDOWN_SECONDS - elapsedSeconds);
      throw new Error(`RESEND_COOLDOWN:${remaining}`);
    }

    // 4. Generate new OTP & hash, reset expiration and attempt count
    const newOtp = generateOtp();
    const newOtpHash = hashOtp(newOtp);
    const now = new Date();
    const newExpiresAt = new Date(now.getTime() + OTP_EXPIRY_MINUTES * 60 * 1000);

    // 5. Send new OTP email FIRST
    await sendVerificationOtpEmail({
      to: normalizedEmail,
      name: pending.name || undefined,
      otp: newOtp,
    });

    // 6. Update pending record in DB only after successful delivery
    await verificationRepository.updateOtp(pending.id, newOtpHash, newExpiresAt, now);

    return {
      success: true,
      message: "A new verification code has been sent to your email.",
    };
  },

  /**
   * Validates the OTP against the pending verification record.
   * Upon successful verification, transactionally creates the User in PostgreSQL
   * and marks the verification record as consumed.
   */
  async verifyAndCreateUser(email: string, inputOtp: string) {
    const normalizedEmail = email.toLowerCase().trim();

    // 1. Find active pending verification
    const pending = await verificationRepository.findByEmail(normalizedEmail);
    if (!pending || pending.isConsumed || !pending.name || !pending.passwordHash) {
      throw new Error("INVALID_OR_CONSUMED_OTP");
    }

    // 2. Check expiration (10 minutes)
    if (new Date() > pending.expiresAt) {
      throw new Error("OTP_EXPIRED");
    }

    // 3. Check attempts count (max 5)
    if (pending.attempts >= pending.maxAttempts) {
      throw new Error("MAX_ATTEMPTS_EXCEEDED");
    }

    // 4. Constant-time comparison of OTP hash
    const isValid = verifyOtpHash(inputOtp, pending.otpHash);
    if (!isValid) {
      const updated = await verificationRepository.incrementAttempts(pending.id);
      const remaining = Math.max(0, updated.maxAttempts - updated.attempts);
      if (remaining === 0) {
        throw new Error("MAX_ATTEMPTS_EXCEEDED");
      }
      throw new Error(`INVALID_OTP:${remaining}`);
    }

    // 5. Atomic Transaction: Create User with emailVerifiedAt and mark verification consumed
    const user = await prisma.$transaction(async (tx) => {
      // Concurrency guard: Ensure email was not registered in a parallel request
      const raceCheck = await tx.user.findUnique({
        where: { email: normalizedEmail },
      });
      if (raceCheck) {
        throw new Error("EMAIL_ALREADY_REGISTERED");
      }

      if (pending.phone) {
        const phoneRace = await tx.user.findUnique({
          where: { phone: pending.phone },
        });
        if (phoneRace) {
          throw new Error("PHONE_ALREADY_REGISTERED");
        }
      }

      // Create new verified customer
      const createdUser = await tx.user.create({
        data: {
          name: pending.name!,
          email: normalizedEmail,
          phone: pending.phone || undefined,
          password: pending.passwordHash!,
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

      // Mark verification record consumed
      await tx.emailVerification.update({
        where: { id: pending.id },
        data: { isConsumed: true },
      });

      return createdUser;
    });

    // 6. Generate existing JWT token for cookie creation
    const token = signToken(user.id, user.role);

    return { user, token };
  },
};
