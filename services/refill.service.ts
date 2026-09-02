import { prisma } from "@/lib/prisma";
import { Prisma, SubscriptionFrequency } from "@/app/generated/prisma";
import { subscriptionRepository } from "@/repositories/subscription.repository";
import { ORDER_INCLUDE } from "@/repositories/order.repository";
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
        // 1. Verify subscription's stored delivery address
        if (!sub.address || sub.address.userId !== sub.userId) {
          await notificationService.send({
            userId: sub.userId,
            type: "REFILL",
            title: "Refill Alert: Invalid Delivery Address",
            message: `Your scheduled refill could not be created because the delivery address associated with your subscription is invalid or no longer exists. Please update your subscription delivery address.`,
          });
          failed++;
          continue;
        }
        const deliveryAddressId = sub.addressId;

        // 2. Send pre-refill reminder
        await notificationService.send({
          userId: sub.userId,
          type: "REFILL",
          title: "Refill Reminder",
          message: `Your scheduled refill is being processed now.`,
        });

        // 3. Calculate total and format order items
        const orderItems = sub.items.map((item: (typeof sub.items)[number]) => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.product.price,
        }));

        const total = orderItems.reduce(
          (sum: Prisma.Decimal, item: { productId: string; quantity: number; price: Prisma.Decimal }) =>
            sum.plus(new Prisma.Decimal(item.price.toString()).times(item.quantity)),
          new Prisma.Decimal(0)
        );

        // 4. Atomic transaction: validate stock, deduct inventory, and create order
        const order = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
          for (const item of sub.items) {
            const product = await tx.product.findUnique({
              where: { id: item.productId },
            });

            if (!product || !product.isActive) {
              throw new Error(`INACTIVE_PRODUCTS: ${product?.name ?? item.productId}`);
            }

            if (product.stock < item.quantity) {
              throw new Error(
                `INSUFFICIENT_STOCK: ${product.name} only has ${product.stock} in stock`
              );
            }

            await tx.product.update({
              where: { id: item.productId },
              data: {
                stock: {
                  decrement: item.quantity,
                },
              },
            });
          }

          const createdOrder = await tx.order.create({
            data: {
              userId: sub.userId,
              addressId: deliveryAddressId,
              total,
              items: {
                create: orderItems.map((item: { productId: string; quantity: number; price: Prisma.Decimal }) => ({
                  productId: item.productId,
                  quantity: item.quantity,
                  price: item.price,
                })),
              },
            },
            include: ORDER_INCLUDE,
          });

          return createdOrder;
        });

        // 5. Notify order creation
        await notificationService.send({
          userId: sub.userId,
          type: "ORDER",
          title: "Scheduled Order Created",
          message: `A new order has been created for your ${sub.frequency.toLowerCase()} refill.`,
        });

        // 6. Process payment
        const payment = await paymentService.processPayment(order.id, total, sub.userId);

        // 7. Advance subscription ONLY if payment succeeded
        if (payment && payment.status === "SUCCESS") {
          const nextRefillDate = addFrequencyPeriod(sub.nextRefillDate, sub.frequency);
          await subscriptionRepository.update(sub.id, { nextRefillDate });
          processed++;
        } else {
          // Payment failed (either retryable PENDING or final FAILED).
          // Do NOT advance nextRefillDate so the failed cycle is not skipped.
          // paymentService has already logged the attempt and notified the user.
          // The order remains in PENDING status for manual retry.
          failed++;
        }
      } catch (err) {
        console.error(`[RefillService] Failed to process subscription ${sub.id}:`, err);
        failed++;

        // Notify user of processing failure
        const errorMessage = err instanceof Error ? err.message : "";
        await notificationService.send({
          userId: sub.userId,
          type: "REFILL",
          title: "Refill Processing Error",
          message: errorMessage.startsWith("INSUFFICIENT_STOCK")
            ? `Your scheduled refill could not be processed due to insufficient stock. We will retry once restocked.`
            : `There was an issue processing your scheduled refill. Our team has been notified.`,
        });
      }
    }

    return { processed, failed };
  },
};
