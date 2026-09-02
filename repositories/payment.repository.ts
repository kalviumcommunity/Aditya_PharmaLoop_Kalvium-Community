import { prisma } from "@/lib/prisma";
import { PaymentStatus, PaymentAttemptStatus, Prisma } from "@/app/generated/prisma";

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

  async findByOrder(orderId: string) {
    return prisma.payment.findUnique({
      where: { orderId },
      include: PAYMENT_INCLUDE,
    });
  },

  async updateStatus(id: string, status: PaymentStatus) {
    return prisma.payment.update({
      where: { id },
      data: { status },
      include: PAYMENT_INCLUDE,
    });
  },

  async createAttempt(
    paymentId: string,
    status: PaymentAttemptStatus,
    failureReason?: string
  ) {
    return prisma.paymentAttempt.create({
      data: { paymentId, status, failureReason },
    });
  },

  async countAttempts(paymentId: string): Promise<number> {
    return prisma.paymentAttempt.count({ where: { paymentId } });
  },
};
