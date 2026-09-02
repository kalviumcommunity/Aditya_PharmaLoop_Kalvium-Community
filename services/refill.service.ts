import { Prisma, SubscriptionFrequency } from "@/app/generated/prisma";
import { subscriptionRepository } from "@/repositories/subscription.repository";
import { orderRepository } from "@/repositories/order.repository";
import { paymentService } from "./payment.service";
import { notificationService } from "./notification.service";

/**
 * Compute the next refill date from a given date based on frequency.
 */
function addFrequencyPeriod(from: Date, frequency: SubscriptionFrequency): Date {
  const next = new Date(from);
  switch (frequency) {
    case "WEEKLY":
      next.setDate(next.getDate() + 7);
      break;
    case "BIWEEKLY":
      next.setDate(next.getDate() + 14);
      break;
    case "MONTHLY":
      next.setMonth(next.getMonth() + 1);
      break;
  }
  return next;
}

export const refillService = {
  /**
   * Process all subscriptions that are due for a refill.
   * This is called by the internal `/api/internal/process-refills` endpoint
   * and should be triggered by a cron job in production.
   *
   * Each subscription is processed independently so one failure doesn't
   * block the others.
   */
  async processDueRefills(): Promise<{ processed: number; failed: number }> {
    const dueSubscriptions = await subscriptionRepository.findDue();

    let processed = 0;
    let failed = 0;

    for (const sub of dueSubscriptions) {
      try {
        // Send pre-refill reminder
        await notificationService.send({
          userId: sub.userId,
          type: "REFILL",
          title: "Refill Reminder",
          message: `Your scheduled refill is being processed now.`,
        });

        // Calculate total for this refill
        const orderItems = sub.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.product.price,
        }));

        const total = orderItems.reduce(
          (sum: Prisma.Decimal, item: { productId: string; quantity: number; price: Prisma.Decimal }) =>
            sum.plus(new Prisma.Decimal(item.price.toString()).times(item.quantity)),
          new Prisma.Decimal(0)
        );

        // Create the order
        const order = await orderRepository.create({
          userId: sub.userId,
          items: orderItems,
          total,
        });

        // Notify order creation
        await notificationService.send({
          userId: sub.userId,
          type: "ORDER",
          title: "Scheduled Order Created",
          message: `A new order has been created for your ${sub.frequency.toLowerCase()} refill.`,
        });

        // Process payment
        await paymentService.processPayment(order.id, total, sub.userId);

        // Advance the subscription's next refill date
        const nextRefillDate = addFrequencyPeriod(sub.nextRefillDate, sub.frequency);
        await subscriptionRepository.update(sub.id, { nextRefillDate });

        processed++;
      } catch (err) {
        console.error(`[RefillService] Failed to process subscription ${sub.id}:`, err);
        failed++;

        // Notify user of processing failure
        await notificationService.send({
          userId: sub.userId,
          type: "REFILL",
          title: "Refill Processing Error",
          message: `There was an issue processing your scheduled refill. Our team has been notified.`,
        });
      }
    }

    return { processed, failed };
  },
};
