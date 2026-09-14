import { prisma } from "@/lib/prisma";
import { Prisma, SubscriptionFrequency } from "@/app/generated/prisma";
import { subscriptionRepository } from "@/repositories/subscription.repository";
import { ORDER_INCLUDE } from "@/repositories/order.repository";
import { paymentRepository } from "@/repositories/payment.repository";
import { paymentService } from "./payment.service";
import { notificationService } from "./notification.service";
import { tryDecrementStock, restoreStockForItems } from "@/lib/stock";
import { addMonths } from "@/lib/date-utils";

const MAX_PAYMENT_RETRIES = 3;
const FAILURE_NOTIFY_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour

/**
 * Compute the next refill date from a given date based on frequency and refill time.
 */
export function addFrequencyPeriod(
  from: Date,
  frequency: SubscriptionFrequency,
  refillTime?: string,
): Date {
  let next: Date;
  switch (frequency) {
    case "WEEKLY":
      next = new Date(from);
      next.setDate(next.getDate() + 7);
      break;
    case "BIWEEKLY":
      next = new Date(from);
      next.setDate(next.getDate() + 14);
      break;
    case "MONTHLY":
      next = addMonths(from, 1);
      break;
    default:
      next = new Date(from);
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

/**
 * Idempotently cancel a failed refill order and restore stock exactly once.
 * Safe under concurrent workers: only the first CANCELLED transition restores stock.
 */
async function cancelFailedRefillAndRestoreStock(orderId: string): Promise<boolean> {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: true, payment: true },
    });

    if (!order) return false;
    if (order.status === "CANCELLED") return false;
    if (order.payment?.status === "SUCCESS") return false;

    const cancelled = await tx.order.updateMany({
      where: {
        id: orderId,
        status: { not: "CANCELLED" },
      },
      data: {
        status: "CANCELLED",
        statusChangedAt: new Date(),
      },
    });

    if (cancelled.count === 0) return false;

    await restoreStockForItems(tx, order.items);

    if (order.payment && order.payment.status !== "FAILED") {
      await tx.payment.update({
        where: { id: order.payment.id },
        data: {
          status: "FAILED",
          providerStatus: "refill_retry_exhausted",
        },
      });
    }

    return true;
  });
}

async function pauseSubscription(
  subscriptionId: string,
  pausedAt: Date = new Date(),
) {
  return subscriptionRepository.update(subscriptionId, {
    status: "PAUSED",
    pausedAt,
  });
}

async function sendRefillFailureOnce(
  userId: string,
  title: string,
  message: string,
) {
  const recent = await prisma.notification.findFirst({
    where: {
      userId,
      type: "REFILL",
      title,
      createdAt: { gte: new Date(Date.now() - FAILURE_NOTIFY_COOLDOWN_MS) },
    },
    select: { id: true },
  });
  if (recent) return;

  await notificationService.send({
    userId,
    type: "REFILL",
    title,
    message,
  });
}

export const refillService = {
  /**
   * Process all subscriptions that are due for a refill.
   * This is called by the internal `/api/internal/process-refills` endpoint
   * and can be triggered on a recurring worker/cron schedule.
   *
   * Each subscription is processed independently so one failure doesn't
   * block others.
   *
   * State transitions on hard failure:
   * - Payment retry exhaustion (3 attempts): ACTIVE → PAUSED, order CANCELLED, stock restored
   * - Inactive products: ACTIVE → PAUSED (no order created / stock unchanged)
   */
  async processDueRefills(
    asOf: Date = new Date(),
  ): Promise<{ processed: number; failed: number }> {
    const dueSubscriptions = await subscriptionRepository.findDue(asOf);

    let processed = 0;
    let failed = 0;

    for (const sub of dueSubscriptions) {
      try {
        if (sub.status !== "ACTIVE") {
          continue;
        }

        if (!sub.address || sub.address.userId !== sub.userId) {
          await sendRefillFailureOnce(
            sub.userId,
            "Refill Alert: Invalid Delivery Address",
            `Your scheduled refill could not be created because the delivery address associated with your subscription is invalid or no longer exists. Please update your subscription delivery address.`,
          );
          failed++;
          continue;
        }
        const deliveryAddressId = sub.addressId;

        const refillOrderId = getRefillCycleOrderId(sub.id, sub.nextRefillDate);

        let order = await prisma.order.findUnique({
          where: { id: refillOrderId },
          include: ORDER_INCLUDE,
        });

        if (!order) {
          await notificationService.send({
            userId: sub.userId,
            type: "REFILL",
            title: "Refill Reminder",
            message: `Your scheduled refill is being processed now.`,
          });

          const createdOrder = await prisma
            .$transaction(async (tx: Prisma.TransactionClient) => {
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

              for (const item of freshSub.items) {
                const product = await tx.product.findUnique({
                  where: { id: item.productId },
                });

                if (!product || !product.isActive) {
                  throw new Error(
                    `INACTIVE_PRODUCTS: ${product?.name ?? item.productId}`,
                  );
                }

                const decremented = await tryDecrementStock(
                  tx,
                  item.productId,
                  item.quantity,
                );
                if (!decremented) {
                  const live = await tx.product.findUnique({
                    where: { id: item.productId },
                  });
                  if (!live || !live.isActive) {
                    throw new Error(
                      `INACTIVE_PRODUCTS: ${live?.name ?? item.productId}`,
                    );
                  }
                  throw new Error(
                    `INSUFFICIENT_STOCK: ${live.name} only has ${live.stock} in stock`,
                  );
                }
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
              const existing = await prisma.order.findUnique({
                where: { id: refillOrderId },
                include: ORDER_INCLUDE,
              });
              if (existing) return existing;
              throw txErr;
            });

          order = createdOrder;

          await notificationService.send({
            userId: sub.userId,
            type: "ORDER",
            title: "Scheduled Order Created",
            message: `A new order has been created for your ${sub.frequency.toLowerCase()} refill.`,
          });
        }

        // Skip already-cancelled exhausted cycles
        if (order.status === "CANCELLED") {
          if (sub.status === "ACTIVE") {
            await pauseSubscription(sub.id);
          }
          failed++;
          continue;
        }

        let payment =
          order.payment ?? (await paymentRepository.findByOrder(order.id));

        if (!payment || payment.status !== "SUCCESS") {
          const attemptCount = payment
            ? await paymentRepository.countAttempts(payment.id)
            : 0;

          if (payment?.status === "FAILED" || attemptCount >= MAX_PAYMENT_RETRIES) {
            // C-02 + C-03: restore stock once, pause subscription, stop worker loop
            await cancelFailedRefillAndRestoreStock(order.id);
            await pauseSubscription(sub.id);
            await sendRefillFailureOnce(
              sub.userId,
              "Subscription Paused: Payment Failed",
              `Your refill payment failed after ${MAX_PAYMENT_RETRIES} attempts. Your subscription has been paused and reserved stock was released. You can update payment details and resume from your subscriptions page.`,
            );
            failed++;
            continue;
          }

          if (attemptCount < MAX_PAYMENT_RETRIES) {
            // Interactive Razorpay Checkout cannot run in a background worker.
            // Leave the cycle pending for an authenticated customer retry.
            payment = await paymentService.processPayment(
              order.id,
              order.total,
            );
          }
        }

        if (payment && payment.status === "SUCCESS") {
          const nextRefillDate = addFrequencyPeriod(
            sub.nextRefillDate,
            sub.frequency,
            sub.refillTime,
          );
          await subscriptionRepository.update(sub.id, { nextRefillDate });
          processed++;
        } else {
          // Payment still pending customer action — keep nextRefillDate so cycle is not skipped
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

        if (errorMessage.startsWith("INACTIVE_PRODUCTS")) {
          // H-04: pause so the worker does not loop forever
          await pauseSubscription(sub.id);
          await sendRefillFailureOnce(
            sub.userId,
            "Subscription Paused: Product Unavailable",
            `Your subscription was paused because one or more products are no longer available. Please update your subscription items and resume when ready.`,
          );
          continue;
        }

        await sendRefillFailureOnce(
          sub.userId,
          "Refill Processing Error",
          errorMessage.startsWith("INSUFFICIENT_STOCK")
            ? `Your scheduled refill could not be processed due to insufficient stock. We will retry once restocked.`
            : `There was an issue processing your scheduled refill. Our team has been notified.`,
        );
      }
    }

    return { processed, failed };
  },
};
