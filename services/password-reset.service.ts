import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { userRepository } from "@/repositories/user.repository";
import { verificationRepository } from "@/repositories/verification.repository";
import { sendPasswordResetOtpEmail } from "@/lib/email";

const OTP_EXPIRY_MINUTES = 10;
const RESET_TOKEN_EXPIRY_MINUTES = 15;
const RESEND_COOLDOWN_SECONDS = 60;

function getOtpSecret(): string {
  const secret = process.env.OTP_HASH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("MISSING_OTP_HASH_SECRET: OTP_HASH_SECRET environment variable is required in production.");
    }
    return "pharmaloop-dev-otp-secret-2026";
  }
  return secret;
}

export function generateOtp(): string {
  return crypto.randomInt(0, 1000000).toString().padStart(6, "0");
}

export function hashOtp(otp: string): string {
  const secret = getOtpSecret();
  return crypto.createHmac("sha256", secret).update(otp).digest("hex");
}

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

export function hashResetToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export const passwordResetService = {
  /**
   * Initiates password recovery.
   * Generates a 6-digit OTP, dispatches real email via Brevo SMTP,
   * and persists hashed verification record.
   * Strictly avoids leaking email existence (anti-enumeration).
   */
  async initiatePasswordReset(email: string): Promise<{ success: true; message: string }> {
    const normalizedEmail = email.toLowerCase().trim();
    const genericSuccess = {
      success: true as const,
      message: "If an account exists with this email, a verification code has been sent.",
    };

    // 1. Check if user exists (generic response if not found)
    const user = await userRepository.findByEmail(normalizedEmail);
    if (!user) {
      return genericSuccess;
    }

    // 2. Enforce 60-second resend cooldown
    const existing = await verificationRepository.findByEmail(normalizedEmail, "PASSWORD_RESET");
    if (existing && !existing.isConsumed) {
      const elapsed = (Date.now() - existing.lastSentAt.getTime()) / 1000;
      if (elapsed < RESEND_COOLDOWN_SECONDS) {
        const remaining = Math.ceil(RESEND_COOLDOWN_SECONDS - elapsed);
        throw new Error(`RESEND_COOLDOWN:${remaining}`);
      }
    }

    // 3. Generate secure OTP and HMAC hash
    const otp = generateOtp();
    const otpHash = hashOtp(otp);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
    const now = new Date();

    // 4. Send real email via Brevo
    await sendPasswordResetOtpEmail({
      to: normalizedEmail,
      otp,
      name: user.name,
    });

    // 5. Persist record in database
    await verificationRepository.upsertPasswordReset({
      email: normalizedEmail,
      otpHash,
      expiresAt,
      lastSentAt: now,
    });

    return genericSuccess;
  },

  /**
   * Verifies the 6-digit OTP for password reset.
   * Enforces 10-minute expiry, max 5 attempts, single-use OTP.
   * On success: consumes OTP and returns a single-use 32-byte reset token.
   */
  async verifyResetOtp(
    email: string,
    otp: string
  ): Promise<{ success: true; resetToken: string; message: string }> {
    const normalizedEmail = email.toLowerCase().trim();
    const record = await verificationRepository.findByEmail(normalizedEmail, "PASSWORD_RESET");

    if (!record || record.isConsumed) {
      throw new Error("INVALID_OR_CONSUMED_OTP");
    }

    if (record.expiresAt < new Date()) {
      throw new Error("OTP_EXPIRED");
    }

    // Claim the attempt in the database before checking it. This prevents
    // concurrent requests from exceeding the configured attempt limit.
    const claimed = await verificationRepository.claimAttemptAtomic(record.id);
    if (!claimed) {
      const fresh = await verificationRepository.findByEmail(
        normalizedEmail,
        "PASSWORD_RESET",
      );
      if (!fresh || fresh.isConsumed) {
        throw new Error("INVALID_OR_CONSUMED_OTP");
      }
      if (fresh.expiresAt < new Date()) {
        throw new Error("OTP_EXPIRED");
      }
      throw new Error("MAX_ATTEMPTS_EXCEEDED");
    }

    const isValid = verifyOtpHash(otp.trim(), claimed.otpHash);
    if (!isValid) {
      const remaining = claimed.maxAttempts - claimed.attempts;
      if (remaining <= 0) {
        throw new Error("MAX_ATTEMPTS_EXCEEDED");
      }
      throw new Error(`INVALID_OTP:${remaining}`);
    }

    // Generate crypto-secure 32-byte hex reset authorization token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenHash = hashResetToken(resetToken);
    const resetTokenExpiry = new Date(Date.now() + RESET_TOKEN_EXPIRY_MINUTES * 60 * 1000);

    // Atomically consume the OTP and save its reset authorization. A second
    // concurrent valid submission must not mint another reset token.
    const consumed = await verificationRepository.storeResetTokenIfActive(
      record.id,
      resetTokenHash,
      resetTokenExpiry,
    );
    if (!consumed) {
      throw new Error("INVALID_OR_CONSUMED_OTP");
    }

    return {
      success: true,
      resetToken,
      message: "Code verified successfully. Please set your new password.",
    };
  },

  /**
   * Atomically updates user password using the single-use reset authorization token.
   * Immediately invalidates old password and revokes reset token.
   */
  async resetPassword(
    resetToken: string,
    newPassword: string
  ): Promise<{ success: true; message: string }> {
    const tokenHash = hashResetToken(resetToken.trim());
    // Hash new password using bcrypt (12 rounds)
    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    // Atomically claim the reset token, then update its owner. Claiming first
    // makes the authorization single-use even under simultaneous requests.
    const record = await prisma.$transaction(async (tx) => {
      const resetRecord = await tx.emailVerification.findFirst({
        where: {
          resetTokenHash: tokenHash,
          type: "PASSWORD_RESET",
          resetTokenExpiry: { gt: new Date() },
        },
      });
      if (!resetRecord) return null;

      const claimed = await tx.emailVerification.updateMany({
        where: {
          id: resetRecord.id,
          resetTokenHash: tokenHash,
          type: "PASSWORD_RESET",
          resetTokenExpiry: { gt: new Date() },
        },
        data: {
          resetTokenHash: null,
          resetTokenExpiry: null,
          isConsumed: true,
        },
      });
      if (claimed.count !== 1) return null;

      const user = await tx.user.findUnique({
        where: { email: resetRecord.email },
      });
      if (!user) throw new Error("USER_NOT_FOUND");

      await tx.user.update({
        where: { id: user.id },
        data: { password: newPasswordHash },
      });

      return resetRecord;
    });

    if (!record) {
      throw new Error("INVALID_OR_EXPIRED_RESET_TOKEN");
    }

    return {
      success: true,
      message: "Your password has been reset successfully. Please log in with your new password.",
    };
  },
};
