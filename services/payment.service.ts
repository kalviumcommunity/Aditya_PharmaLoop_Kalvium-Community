import { Prisma } from "@/app/generated/prisma";
import { paymentRepository } from "@/repositories/payment.repository";
import { orderRepository } from "@/repositories/order.repository";
import { notificationService } from "./notification.service";

/** Maximum auto-retry attempts before declaring final failure. */
const MAX_RETRIES = 3;

/**
 * Simulated payment gateway.
 * Succeeds ~70% of the time to demonstrate retry workflows.
 * Replace with a real gateway (Razorpay / Stripe) in production.
 */
function simulateGateway(): boolean {
  return Math.random() < 0.7;
}

export const paymentService = {
  /**
   * Create a payment record and attempt the first charge.
   * Persists the outcome before notifying the user.
   */
  async processPayment(orderId: string, amount: Prisma.Decimal, userId?: string) {
    // Create or find the payment record
    let payment = await paymentRepository.findByOrder(orderId);
    if (!payment) {
      payment = await paymentRepository.create(orderId, amount);
    }

    const order = await orderRepository.findById(orderId);
    const ownerUserId = userId ?? order?.userId;

    const success = simulateGateway();

    if (success) {
      // Persist success BEFORE notifying
      await paymentRepository.createAttempt(payment.id, "SUCCESS");
      const updated = await paymentRepository.updateStatus(payment.id, "SUCCESS");
      await orderRepository.updateStatus(orderId, "CONFIRMED");

      if (ownerUserId) {
        await notificationService.send({
          userId: ownerUserId,
          type: "PAYMENT",
          title: "Payment Successful",
          message: `Your payment was successful. Order confirmed.`,
        });
        await notificationService.send({
          userId: ownerUserId,
          type: "ORDER",
          title: "Order Confirmed",
          message: `Your order has been confirmed and is being prepared.`,
        });
      }

      return updated;
    } else {
      // Persist failure BEFORE notifying
      await paymentRepository.createAttempt(payment.id, "FAILED", "Gateway declined");
      const attemptCount = await paymentRepository.countAttempts(payment.id);

      if (attemptCount >= MAX_RETRIES) {
        // Final failure — persist then notify
        const finalPayment = await paymentRepository.updateStatus(payment.id, "FAILED");

        if (ownerUserId) {
          await notificationService.send({
            userId: ownerUserId,
            type: "PAYMENT",
            title: "Payment Failed",
            message: `All ${MAX_RETRIES} payment attempts failed. Please update your payment method and retry manually.`,
          });
        }

        return finalPayment;
      } else {
        // Retryable failure — leave status PENDING
        if (ownerUserId) {
          await notificationService.send({
            userId: ownerUserId,
            type: "PAYMENT",
            title: "Payment Failed — Retrying",
            message: `Payment attempt ${attemptCount} of ${MAX_RETRIES} failed. The system will retry automatically.`,
          });
        }

        return payment;
      }
    }
  },

  async getPaymentByOrder(userId: string, orderId: string) {
    const order = await orderRepository.findById(orderId);
    if (!order) throw new Error("NOT_FOUND");
    if (order.userId !== userId) throw new Error("FORBIDDEN");

    const payment = await paymentRepository.findByOrder(orderId);
    if (!payment) throw new Error("NOT_FOUND");
    return payment;
  },

  async retryPayment(userId: string, orderId: string) {
    const order = await orderRepository.findById(orderId);
    if (!order) throw new Error("NOT_FOUND");
    if (order.userId !== userId) throw new Error("FORBIDDEN");

    const payment = await paymentRepository.findByOrder(orderId);
    if (!payment) throw new Error("NOT_FOUND");
    if (payment.status === "SUCCESS") throw new Error("ALREADY_PAID");

    return this.processPayment(orderId, payment.amount, userId);
  },
};
