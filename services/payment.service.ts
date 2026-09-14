import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/app/generated/prisma";
import { PaymentMethod } from "@/app/generated/prisma";
import {
  getRazorpayClient,
  getRazorpayKeyId,
  RAZORPAY_CURRENCY,
} from "@/lib/razorpay";
import { paymentRepository } from "@/repositories/payment.repository";
import { orderRepository } from "@/repositories/order.repository";
import { subscriptionRepository } from "@/repositories/subscription.repository";
import { addFrequencyPeriod } from "./refill.service";
import { notificationService } from "./notification.service";

const MAX_RETRIES = 3;

interface RazorpayPaymentInput {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

function verifySignature(
  orderId: string,
  paymentId: string,
  signature: string,
) {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) throw new Error("RAZORPAY_NOT_CONFIGURED");

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${orderId}|${paymentId}`)
    .digest();
  const received = Buffer.from(signature, "hex");
  return (
    received.length === expected.length &&
    crypto.timingSafeEqual(received, expected)
  );
}

export const paymentService = {
  async processPayment(
    orderId: string,
    amount: Prisma.Decimal,
    paymentMethod: PaymentMethod = "ONLINE",
  ) {
    return paymentRepository.upsert(orderId, amount, paymentMethod);
  },

  async createRazorpayOrder(userId: string, orderId: string) {
    const order = await orderRepository.findById(orderId);
    if (!order) throw new Error("NOT_FOUND");
    if (order.userId !== userId) throw new Error("FORBIDDEN");
    if (order.status === "CANCELLED") throw new Error("ORDER_NOT_PAYABLE");

    const payment =
      (await paymentRepository.findByOrder(order.id)) ??
      (await paymentRepository.upsert(order.id, order.total, "ONLINE"));
    if (payment.status === "SUCCESS") throw new Error("ALREADY_PAID");
    if (payment.paymentMethod === "COD")
      throw new Error("COD_NOT_PAYABLE_ONLINE");

    const keyId = getRazorpayKeyId();
    if (payment.providerOrderId) {
      return {
        keyId,
        orderId: order.id,
        razorpayOrderId: payment.providerOrderId,
        amount: new Prisma.Decimal(payment.amount).mul(100).toNumber(),
        currency: payment.currency ?? RAZORPAY_CURRENCY,
      };
    }

    const razorpayOrder = await getRazorpayClient().orders.create({
      amount: new Prisma.Decimal(payment.amount).mul(100).toNumber(),
      currency: RAZORPAY_CURRENCY,
      receipt: order.id,
      notes: { pharmaloopOrderId: order.id },
    });

    await paymentRepository.updateProviderOrder(
      payment.id,
      razorpayOrder.id,
      RAZORPAY_CURRENCY,
    );

    return {
      keyId,
      orderId: order.id,
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
    };
  },

  async verifyRazorpayPayment(
    userId: string,
    orderId: string,
    input: RazorpayPaymentInput,
  ) {
    const order = await orderRepository.findById(orderId);
    if (!order) throw new Error("NOT_FOUND");
    if (order.userId !== userId) throw new Error("FORBIDDEN");

    const payment = await paymentRepository.findByOrder(orderId);
    if (!payment) throw new Error("NOT_FOUND");
    if (payment.status === "SUCCESS") {
      if (
        payment.providerOrderId === input.razorpayOrderId &&
        payment.providerPaymentId === input.razorpayPaymentId &&
        payment.providerSignature === input.razorpaySignature
      ) {
        return payment;
      }
      throw new Error("INVALID_PAYMENT");
    }
    if (payment.providerOrderId !== input.razorpayOrderId)
      throw new Error("INVALID_PAYMENT");
    if (
      payment.providerPaymentId &&
      payment.providerPaymentId !== input.razorpayPaymentId
    ) {
      throw new Error("INVALID_PAYMENT");
    }
    if (
      !verifySignature(
        input.razorpayOrderId,
        input.razorpayPaymentId,
        input.razorpaySignature,
      )
    ) {
      throw new Error("INVALID_SIGNATURE");
    }

    try {
      const updated = await prisma.$transaction(
        async (tx: Prisma.TransactionClient) => {
          const claimed = await tx.payment.updateMany({
            where: {
              id: payment.id,
              status: { not: "SUCCESS" },
              OR: [
                { providerPaymentId: null },
                { providerPaymentId: input.razorpayPaymentId },
              ],
            },
            data: {
              status: "SUCCESS",
              provider: "RAZORPAY",
              providerPaymentId: input.razorpayPaymentId,
              providerSignature: input.razorpaySignature,
              providerStatus: "captured",
              providerErrorCode: null,
              providerErrorDescription: null,
            },
          });

          if (claimed.count === 0) {
            return tx.payment.findUnique({
              where: { id: payment.id },
              include: { attempts: true, order: true },
            });
          }

          await tx.paymentAttempt.create({
            data: { paymentId: payment.id, status: "SUCCESS" },
          });
          await tx.order.update({
            where: { id: orderId },
            data: { status: "CONFIRMED", statusChangedAt: new Date() },
          });
          return tx.payment.findUnique({
            where: { id: payment.id },
            include: { attempts: true, order: true },
          });
        },
      );

      if (updated?.status === "SUCCESS") {
        await notificationService.send({
          userId,
          type: "PAYMENT",
          title: "Payment Successful",
          message: "Your payment was verified and the order is confirmed.",
        });
        await notificationService.send({
          userId,
          type: "ORDER",
          title: "Order Confirmed",
          message: "Your order has been confirmed and is being prepared.",
        });
      }

      return updated;
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const existing = await paymentRepository.findByOrder(orderId);
        if (existing?.status === "SUCCESS") return existing;
      }
      throw error;
    }
  },

  async recordRazorpayFailure(
    userId: string,
    orderId: string,
    providerError?: { code?: string; description?: string },
  ) {
    const order = await orderRepository.findById(orderId);
    if (!order) throw new Error("NOT_FOUND");
    if (order.userId !== userId) throw new Error("FORBIDDEN");

    const payment = await paymentRepository.findByOrder(orderId);
    if (!payment) throw new Error("NOT_FOUND");
    if (payment.status === "SUCCESS") return payment;

    await paymentRepository.createAttempt(
      payment.id,
      "FAILED",
      providerError?.description ||
        providerError?.code ||
        "Razorpay payment failed",
    );
    const attemptCount = await paymentRepository.countAttempts(payment.id);
    const updated = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        provider: "RAZORPAY",
        providerStatus: "failed",
        providerErrorCode: providerError?.code,
        providerErrorDescription: providerError?.description,
        ...(attemptCount >= MAX_RETRIES ? { status: "FAILED" } : {}),
      },
      include: { attempts: true, order: true },
    });

    await notificationService.send({
      userId,
      type: "PAYMENT",
      title: "Payment Failed",
      message:
        attemptCount >= MAX_RETRIES
          ? `All ${MAX_RETRIES} payment attempts failed. Payment retry limit exceeded.`
          : `Payment attempt ${attemptCount} of ${MAX_RETRIES} failed. You can retry again.`,
    });

    // Refill retry exhaustion: restore stock + pause subscription immediately
    // (worker will also no-op safely if it runs later).
    if (attemptCount >= MAX_RETRIES && orderId.startsWith("refill_")) {
      await this.handleRefillPaymentExhausted(userId, orderId);
    }

    return updated;
  },

  /**
   * Idempotent cleanup when a refill payment exhausts retries:
   * cancel order, restore stock once, pause subscription.
   */
  async handleRefillPaymentExhausted(userId: string, orderId: string) {
    const match = orderId.match(/^refill_(.+)_(\d+)$/);
    if (!match) return;
    const subscriptionId = match[1];

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true, payment: true },
      });
      if (!order || order.userId !== userId) return;
      if (order.status === "CANCELLED") return;
      if (order.payment?.status === "SUCCESS") return;

      const cancelled = await tx.order.updateMany({
        where: { id: orderId, status: { not: "CANCELLED" } },
        data: { status: "CANCELLED", statusChangedAt: new Date() },
      });
      if (cancelled.count === 0) return;

      for (const item of order.items) {
        await tx.$executeRaw`
          UPDATE "Product"
          SET stock = stock + ${item.quantity},
              "updatedAt" = NOW()
          WHERE id = ${item.productId}
        `;
      }

      if (order.payment && order.payment.status !== "FAILED") {
        await tx.payment.update({
          where: { id: order.payment.id },
          data: { status: "FAILED", providerStatus: "refill_retry_exhausted" },
        });
      }

      await tx.subscription.updateMany({
        where: { id: subscriptionId, status: "ACTIVE", userId },
        data: { status: "PAUSED", pausedAt: new Date() },
      });
    });

    await notificationService.send({
      userId,
      type: "REFILL",
      title: "Subscription Paused: Payment Failed",
      message: `Your refill payment failed after ${MAX_RETRIES} attempts. Your subscription has been paused and reserved stock was released. You can update payment details and resume from your subscriptions page.`,
    });
  },

  async getPaymentByOrder(userId: string, orderId: string) {
    const order = await orderRepository.findById(orderId);
    if (!order) throw new Error("NOT_FOUND");
    if (order.userId !== userId) throw new Error("FORBIDDEN");
    const payment = await paymentRepository.findByOrder(orderId);
    if (!payment) throw new Error("NOT_FOUND");
    return payment;
  },

  async getPaymentHistory(userId: string) {
    return paymentRepository.findByUser(userId);
  },

  async retryPayment(userId: string, orderId: string) {
    const order = await orderRepository.findById(orderId);
    if (!order) throw new Error("NOT_FOUND");
    if (order.userId !== userId) throw new Error("FORBIDDEN");

    const payment = await paymentRepository.findByOrder(orderId);
    if (!payment) throw new Error("NOT_FOUND");
    if (payment.status === "SUCCESS") throw new Error("ALREADY_PAID");
    const attemptCount = await paymentRepository.countAttempts(payment.id);
    if (attemptCount >= MAX_RETRIES || payment.status === "FAILED")
      throw new Error("RETRY_LIMIT_EXCEEDED");
    return this.createRazorpayOrder(userId, orderId);
  },

  async advanceRefillAfterRetry(userId: string, orderId: string) {
    if (!orderId.startsWith("refill_")) return;
    const match = orderId.match(/^refill_(.+)_(\d+)$/);
    if (!match) return;
    const subscriptionId = match[1];
    const cycleTime = Number(match[2]);
    const sub = await subscriptionRepository.findById(subscriptionId);
    if (
      sub &&
      sub.status === "ACTIVE" &&
      sub.userId === userId &&
      new Date(sub.nextRefillDate).getTime() <= cycleTime
    ) {
      const nextRefillDate = addFrequencyPeriod(
        sub.nextRefillDate,
        sub.frequency,
        sub.refillTime,
      );
      await subscriptionRepository.update(sub.id, { nextRefillDate });
      await notificationService.send({
        userId: sub.userId,
        type: "REFILL",
        title: "Refill Scheduled",
        message: `Your scheduled refill payment was successful and next refill is scheduled for ${nextRefillDate.toLocaleDateString()}.`,
      });
    }
  },
};
