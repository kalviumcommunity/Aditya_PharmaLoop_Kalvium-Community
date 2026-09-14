import { prisma } from "@/lib/prisma";

export interface UpsertPendingVerificationData {
  email: string;
  name: string;
  phone?: string;
  passwordHash: string;
  otpHash: string;
  expiresAt: Date;
  lastSentAt: Date;
}

export const verificationRepository = {
  async upsertPending(data: UpsertPendingVerificationData) {
    return prisma.emailVerification.upsert({
      where: {
        email_type: {
          email: data.email,
          type: "SIGNUP",
        },
      },
      create: {
        email: data.email,
        type: "SIGNUP",
        name: data.name,
        phone: data.phone,
        passwordHash: data.passwordHash,
        otpHash: data.otpHash,
        expiresAt: data.expiresAt,
        attempts: 0,
        maxAttempts: 5,
        lastSentAt: data.lastSentAt,
        isConsumed: false,
      },
      update: {
        name: data.name,
        phone: data.phone,
        passwordHash: data.passwordHash,
        otpHash: data.otpHash,
        expiresAt: data.expiresAt,
        attempts: 0,
        lastSentAt: data.lastSentAt,
        isConsumed: false,
      },
    });
  },

  async upsertPasswordReset(data: {
    email: string;
    otpHash: string;
    expiresAt: Date;
    lastSentAt: Date;
  }) {
    return prisma.emailVerification.upsert({
      where: {
        email_type: {
          email: data.email,
          type: "PASSWORD_RESET",
        },
      },
      create: {
        email: data.email,
        type: "PASSWORD_RESET",
        otpHash: data.otpHash,
        expiresAt: data.expiresAt,
        lastSentAt: data.lastSentAt,
        attempts: 0,
        maxAttempts: 5,
        isConsumed: false,
      },
      update: {
        otpHash: data.otpHash,
        expiresAt: data.expiresAt,
        lastSentAt: data.lastSentAt,
        attempts: 0,
        isConsumed: false,
        resetTokenHash: null,
        resetTokenExpiry: null,
      },
    });
  },

  async findByEmail(email: string, type: "SIGNUP" | "PASSWORD_RESET" = "SIGNUP") {
    return prisma.emailVerification.findUnique({
      where: {
        email_type: {
          email,
          type,
        },
      },
    });
  },

  async incrementAttempts(id: string) {
    return prisma.emailVerification.update({
      where: { id },
      data: {
        attempts: { increment: 1 },
      },
    });
  },

  /**
   * Atomically claims one OTP verification attempt.
   * Increments attempts only when not consumed, not expired, and under the max.
   * Returns the updated row, or null if no attempt slot was available.
   */
  async claimAttemptAtomic(id: string) {
    const rows = await prisma.$queryRaw<
      Array<{
        id: string;
        email: string;
        otpHash: string;
        attempts: number;
        maxAttempts: number;
        expiresAt: Date;
        isConsumed: boolean;
        name: string | null;
        phone: string | null;
        passwordHash: string | null;
      }>
    >`
      UPDATE "EmailVerification"
      SET attempts = attempts + 1,
          "updatedAt" = NOW()
      WHERE id = ${id}
        AND "isConsumed" = false
        AND "expiresAt" > NOW()
        AND attempts < "maxAttempts"
      RETURNING
        id, email, "otpHash", attempts, "maxAttempts", "expiresAt",
        "isConsumed", name, phone, "passwordHash"
    `;
    return rows[0] ?? null;
  },

  /**
   * Atomically claims a resend slot when the cooldown has elapsed.
   * Returns true if the cooldown was claimed (caller may send email + update OTP).
   */
  async claimResendCooldown(
    id: string,
    cooldownSeconds: number,
  ): Promise<boolean> {
    const affected = await prisma.$executeRaw`
      UPDATE "EmailVerification"
      SET "lastSentAt" = NOW(),
          "updatedAt" = NOW()
      WHERE id = ${id}
        AND "isConsumed" = false
        AND "lastSentAt" <= (NOW() - make_interval(secs => ${cooldownSeconds}))
    `;
    return Number(affected) === 1;
  },

  async markConsumed(id: string) {
    return prisma.emailVerification.update({
      where: { id },
      data: { isConsumed: true },
    });
  },

  async storeResetToken(id: string, resetTokenHash: string, resetTokenExpiry: Date) {
    return prisma.emailVerification.update({
      where: { id },
      data: {
        isConsumed: true,
        resetTokenHash,
        resetTokenExpiry,
      },
    });
  },

  /**
   * Consumes a valid OTP only once while storing a password-reset token.
   * The conditional update closes the race between simultaneous valid OTP
   * submissions.
   */
  async storeResetTokenIfActive(
    id: string,
    resetTokenHash: string,
    resetTokenExpiry: Date,
  ): Promise<boolean> {
    const updated = await prisma.emailVerification.updateMany({
      where: {
        id,
        isConsumed: false,
        expiresAt: { gt: new Date() },
      },
      data: {
        isConsumed: true,
        resetTokenHash,
        resetTokenExpiry,
      },
    });
    return updated.count === 1;
  },

  async findByResetTokenHash(resetTokenHash: string) {
    return prisma.emailVerification.findFirst({
      where: {
        resetTokenHash,
        type: "PASSWORD_RESET",
        resetTokenExpiry: {
          gt: new Date(),
        },
      },
    });
  },

  async consumeResetToken(id: string) {
    return prisma.emailVerification.update({
      where: { id },
      data: {
        resetTokenHash: null,
        resetTokenExpiry: null,
      },
    });
  },

  async updateOtp(id: string, otpHash: string, expiresAt: Date, lastSentAt: Date) {
    return prisma.emailVerification.update({
      where: { id },
      data: {
        otpHash,
        expiresAt,
        lastSentAt,
        attempts: 0,
        isConsumed: false,
      },
    });
  },

  async deleteByEmail(email: string, type?: "SIGNUP" | "PASSWORD_RESET") {
    return prisma.emailVerification.deleteMany({
      where: {
        email,
        ...(type ? { type } : {}),
      },
    });
  },

  async cleanupExpired(beforeDate: Date) {
    return prisma.emailVerification.deleteMany({
      where: {
        OR: [
          { isConsumed: true },
          { expiresAt: { lt: beforeDate } },
        ],
      },
    });
  },
};
