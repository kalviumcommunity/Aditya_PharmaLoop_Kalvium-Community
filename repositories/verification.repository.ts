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
