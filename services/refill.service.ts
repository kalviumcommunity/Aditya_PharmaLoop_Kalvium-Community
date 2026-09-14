import { prisma } from "@/lib/prisma";
import { Prisma, SubscriptionFrequency } from "@/app/generated/prisma";
import { subscriptionRepository } from "@/repositories/subscription.repository";
import { ORDER_INCLUDE } from "@/repositories/order.repository";
import { paymentRepository } from "@/repositories/payment.repository";
import { paymentService } from "./payment.service";
import { notificationService } from "./notification.service";

/**
 * Compute the next refill date from a given date based on frequency and refill time.
 */
export function addFrequencyPeriod(
  from: Date,
  frequency: SubscriptionFrequency,
  refillTime?: string,
): Date {
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
  if (refillTime && /^\d{2}:\d{2}$/.test(refillTime)) {
    const [hours, minutes] = refillTime.split(":").map(Number);
    next.setHours(hours, minutes, 0, 0);
  }
  return next;
}

/**
 * Generates a deterministic, cycle-specific Order ID for a scheduled subscription refill.
 * This guarantees PostgreSQL primary key level idempotency and crash recovery across worker runs.
 */
export function getRefillCycleOrderId(
  subscriptionId: string,
  cycleDate: Date,
): string {
  const cycleTimestamp = new Date(cycleDate).getTime();
  return `refill_${subscriptionId}_${cycleTimestamp}`;
}

export const refillService = {
  /**
   * Process all subscriptions that are due for a refill.
   * This is called by the internal `/api/internal/process-refills` endpoint
   * and can be triggered on a recurring worker/cron schedule.
   *
   * Each subscription is processed independently so one failure doesn't
   * block others.
   */
  async processDueRefills(
    asOf: Date = new Date(),
  ): Promise<{ processed: number; failed: number }> {
    const dueSubscriptions = await subscriptionRepository.findDue(asOf);

    let processed = 0;
    let failed = 0;

    for (const sub of dueSubscriptions) {
      try {
        // 1. Verify subscription is active and has valid delivery address
        if (sub.status !== "ACTIVE") {
          continue;
        }

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

        // 2. Deterministic cycle order ID
        const refillOrderId = getRefillCycleOrderId(sub.id, sub.nextRefillDate);

        // 3. Inspect if an order was ALREADY created for this exact refill cycle (Idempotency & Crash Recovery)
        let order = await prisma.order.findUnique({
          where: { id: refillOrderId },
          include: ORDER_INCLUDE,
        });

        if (!order) {
          // Pre-refill notification
          await notificationService.send({
            userId: sub.userId,
            type: "REFILL",
            title: "Refill Reminder",
            message: `Your scheduled refill is being processed now.`,
          });

          // 4. Atomic transaction: validate live subscription, validate stock, deduct inventory, and create order
          const createdOrder = await prisma
            .$transaction(async (tx: Prisma.TransactionClient) => {
              // Re-fetch subscription to guarantee we use current persisted configuration
              const freshSub = await tx.subscription.findUnique({
                where: { id: sub.id },
                include: {
                  address: true,
                  items: { include: { product: true } },
                },
              });

              if (!freshSub || freshSub.status !== "ACTIVE") {
                throw new Error("SUBSCRIPTION_INACTIVE_OR_CANCELLED");
              }

              // Check race condition within transaction
              const raceCheck = await tx.order.findUnique({
                where: { id: refillOrderId },
                include: ORDER_INCLUDE,
              });
              if (raceCheck) return raceCheck;

              if (
                !freshSub.address ||
                freshSub.address.userId !== freshSub.userId
              ) {
                throw new Error("INVALID_ADDRESS");
              }

              if (!freshSub.items || freshSub.items.length === 0) {
                throw new Error("EMPTY_SUBSCRIPTION_ITEMS");
              }

              const orderItems = freshSub.items.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
                price: item.product.price,
              }));

              const total = orderItems.reduce(
                (sum: Prisma.Decimal, item) =>
                  sum.plus(
                    new Prisma.Decimal(item.price.toString()).times(
                      item.quantity,
                    ),
                  ),
                new Prisma.Decimal(0),
              );

              // Validate product stock & decrement atomically
              for (const item of freshSub.items) {
                const product = await tx.product.findUnique({
                  where: { id: item.productId },
                });

                if (!product || !product.isActive) {
                  throw new Error(
                    `INACTIVE_PRODUCTS: ${product?.name ?? item.productId}`,
                  );
                }

                if (product.stock < item.quantity) {
                  throw new Error(
                    `INSUFFICIENT_STOCK: ${product.name} only has ${product.stock} in stock`,
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

              const newOrder = await tx.order.create({
                data: {
                  id: refillOrderId,
                  userId: freshSub.userId,
                  addressId: deliveryAddressId,
                  total,
                  items: {
                    create: orderItems.map((item) => ({
                      productId: item.productId,
                      quantity: item.quantity,
                      price: item.price,
                    })),
                  },
                },
                include: ORDER_INCLUDE,
              });

              return newOrder;
            })
            .catch(async (txErr) => {
              // Idempotency & race recovery: if another worker created the order concurrently, recover it
              const existing = await prisma.order.findUnique({
                where: { id: refillOrderId },
                include: ORDER_INCLUDE,
              });
              if (existing) return existing;
              throw txErr;
            });

          order = createdOrder;

          // Notify order creation
          await notificationService.send({
            userId: sub.userId,
            type: "ORDER",
            title: "Scheduled Order Created",
            message: `A new order has been created for your ${sub.frequency.toLowerCase()} refill.`,
          });
        }

        // 5. Payment processing & Idempotency / Retry Handling
        let payment =
          order.payment ?? (await paymentRepository.findByOrder(order.id));

        if (!payment || payment.status !== "SUCCESS") {
          const attemptCount = payment
            ? await paymentRepository.countAttempts(payment.id)
            : 0;
          if (attemptCount < 3) {
            // Interactive Razorpay Checkout cannot run in a background worker.
            // Leave the cycle pending for an authenticated customer retry.
            payment = await paymentService.processPayment(
              order.id,
              order.total,
            );
          }
        }

        // 6. Advance subscription ONLY if payment succeeded
        if (payment && payment.status === "SUCCESS") {
          const nextRefillDate = addFrequencyPeriod(
            sub.nextRefillDate,
            sub.frequency,
            sub.refillTime,
          );
          await subscriptionRepository.update(sub.id, { nextRefillDate });
          processed++;
        } else {
          // Payment failed or still pending.
          // Do NOT advance nextRefillDate so the failed cycle is not skipped.
          failed++;
        }
      } catch (err: unknown) {
        console.error(
          `[RefillService] Failed to process subscription ${sub.id}:`,
          err,
        );
        failed++;

        const errorMessage = err instanceof Error ? err.message : "";
        if (errorMessage === "SUBSCRIPTION_INACTIVE_OR_CANCELLED") {
          continue;
        }

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
