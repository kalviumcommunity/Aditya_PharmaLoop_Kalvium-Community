import { prisma } from "@/lib/prisma";
import {
  PaymentStatus,
  PaymentAttemptStatus,
  PaymentMethod,
  Prisma,
} from "@/app/generated/prisma";

const PAYMENT_INCLUDE = {
  attempts: {
    orderBy: { createdAt: "desc" as const },
  },
  order: true,
};

export const paymentRepository = {
  async create(orderId: string, amount: Prisma.Decimal) {
    return prisma.payment.create({
      data: { orderId, amount },
      include: PAYMENT_INCLUDE,
    });
  },

  async upsert(
    orderId: string,
    amount: Prisma.Decimal,
    paymentMethod: PaymentMethod = "ONLINE",
  ) {
    return prisma.payment.upsert({
      where: { orderId },
      create: { orderId, amount, paymentMethod },
      update: { paymentMethod },
      include: PAYMENT_INCLUDE,
    });
  },

  async findByOrder(orderId: string) {
    return prisma.payment.findUnique({
      where: { orderId },
      include: PAYMENT_INCLUDE,
    });
  },

  async findByUser(userId: string) {
    return prisma.payment.findMany({
      where: { order: { userId } },
      include: {
        order: { select: { id: true, createdAt: true, status: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  },

  async updateStatus(id: string, status: PaymentStatus) {
    return prisma.payment.update({
      where: { id },
      data: { status },
      include: PAYMENT_INCLUDE,
    });
  },

  async updateProviderOrder(
    id: string,
    providerOrderId: string,
    currency: string,
  ) {
    return prisma.payment.update({
      where: { id },
      data: { provider: "RAZORPAY", providerOrderId, currency },
      include: PAYMENT_INCLUDE,
    });
  },

  async createAttempt(
    paymentId: string,
    status: PaymentAttemptStatus,
    failureReason?: string,
  ) {
    return prisma.paymentAttempt.create({
      data: { paymentId, status, failureReason },
    });
  },

  async countAttempts(paymentId: string): Promise<number> {
    return prisma.paymentAttempt.count({ where: { paymentId } });
  },
};
