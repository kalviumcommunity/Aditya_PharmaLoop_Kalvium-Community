import { prisma } from "@/lib/prisma";
import { OrderStatus, Prisma } from "@/app/generated/prisma";
import {
  orderRepository,
  ORDER_INCLUDE,
} from "@/repositories/order.repository";
import { addressRepository } from "@/repositories/address.repository";
import { paymentService } from "./payment.service";
import { notificationService } from "./notification.service";
import { tryDecrementStock } from "@/lib/stock";
import { CreateOrderInput } from "@/types";

/**
 * Demo: 10 seconds per stage.
 * Production default: 6 hours per stage.
 * Override with DELIVERY_PROGRESSION_STAGE_MS (milliseconds).
 */
function getProgressionStageMs(): number {
  const fromEnv = process.env.DELIVERY_PROGRESSION_STAGE_MS;
  if (fromEnv && Number.isFinite(Number(fromEnv)) && Number(fromEnv) > 0) {
    return Number(fromEnv);
  }
  return process.env.NODE_ENV === "production" ? 6 * 60 * 60 * 1000 : 10_000;
}

/**
 * Idempotently marks a COD payment SUCCESS when the order is DELIVERED.
 * Does not touch ONLINE payments.
 */
async function markCodPaymentSuccessOnDelivered(orderId: string): Promise<void> {
  await prisma.payment.updateMany({
    where: {
      orderId,
      paymentMethod: "COD",
      status: { in: ["PENDING", "FAILED"] },
    },
    data: {
      status: "SUCCESS",
      providerStatus: "collected_on_delivery",
    },
  });
}

export const orderService = {
  /**
   * Creates a one-time order from the user's current cart.
   * Cart is locked and re-read inside the transaction so concurrent checkouts
   * cannot both consume the same cart. Stock is decremented atomically.
   */
  async createOneTimeOrder(userId: string, input: CreateOrderInput) {
    const address = await addressRepository.findById(input.addressId);
    if (!address || address.userId !== userId) {
      throw new Error("INVALID_ADDRESS");
    }

    const order = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        // Lock cart row so concurrent checkouts serialize on the same cart
        await tx.$queryRaw`
          SELECT id FROM "Cart" WHERE "userId" = ${userId} FOR UPDATE
        `;

        const cart = await tx.cart.findUnique({
          where: { userId },
          include: {
            items: {
              include: { product: true },
              orderBy: { createdAt: "asc" },
            },
          },
        });

        if (!cart || cart.items.length === 0) {
          throw new Error("CART_EMPTY");
        }

        const orderItems = cart.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.product.price,
        }));

        const total = orderItems.reduce(
          (sum, item) =>
            sum.plus(
              new Prisma.Decimal(item.price.toString()).times(item.quantity),
            ),
          new Prisma.Decimal(0),
        );

        for (const item of cart.items) {
          const product = item.product;

          if (!product || !product.isActive) {
            throw new Error("INACTIVE_PRODUCTS_IN_CART");
          }

          const decremented = await tryDecrementStock(
            tx,
            item.productId,
            item.quantity,
          );
          if (!decremented) {
            // Re-read for a clear error message
            const live = await tx.product.findUnique({
              where: { id: item.productId },
            });
            if (!live || !live.isActive) {
              throw new Error("INACTIVE_PRODUCTS_IN_CART");
            }
            throw new Error(
              `INSUFFICIENT_STOCK: ${live.name} only has ${live.stock} available in stock`,
            );
          }
        }

        const createdOrder = await tx.order.create({
          data: {
            userId,
            addressId: input.addressId,
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

        // Consume cart inside the same locked transaction
        await tx.cartItem.deleteMany({
          where: { cartId: cart.id },
        });

        return createdOrder;
      },
    );

    await paymentService.processPayment(order.id, order.total, input.paymentMethod);

    const updatedOrder = await orderRepository.findById(order.id);
    return updatedOrder ?? order;
  },

  async getOrders(userId: string) {
    return orderRepository.findByUser(userId);
  },

  /**
   * Lazy persisted catch-up for delivery stages.
   * Demo timing is 10s/stage; production default is 6h/stage unless overridden.
   */
  async syncDeliveryProgression(orderId: string) {
    const order = await orderRepository.findById(orderId);
    if (!order) return null;

    if (
      order.status !== "CONFIRMED" &&
      order.status !== "PROCESSING" &&
      order.status !== "SHIPPED"
    ) {
      return order;
    }

    const PROGRESSION_STAGE_MS = getProgressionStageMs();
    const PROGRESSION_MAP: Partial<Record<OrderStatus, OrderStatus>> = {
      CONFIRMED: "PROCESSING",
      PROCESSING: "SHIPPED",
      SHIPPED: "DELIVERED",
    };

    const now = Date.now();
    let currentStatus: OrderStatus = order.status;
    let statusTime = new Date(
      order.statusChangedAt ?? order.updatedAt ?? order.createdAt,
    ).getTime();
    let elapsed = now - statusTime;

    while (elapsed >= PROGRESSION_STAGE_MS) {
      const nextStatus: OrderStatus | undefined = PROGRESSION_MAP[currentStatus];
      if (!nextStatus) break;

      const transitionTime = new Date(statusTime + PROGRESSION_STAGE_MS);

      const result = await prisma.order.updateMany({
        where: {
          id: orderId,
          status: currentStatus,
        },
        data: {
          status: nextStatus,
          statusChangedAt: transitionTime,
        },
      });

      if (result.count === 0) {
        break;
      }

      await notificationService
        .send({
          userId: order.userId,
          type: "ORDER",
          title: `Order ${nextStatus === "DELIVERED" ? "Delivered" : "Status Updated: " + nextStatus}`,
          message:
            nextStatus === "DELIVERED"
              ? `Your order #${orderId.slice(-8)} has been delivered successfully.`
              : `Your order #${orderId.slice(-8)} is now ${nextStatus.toLowerCase()}.`,
        })
        .catch((err) =>
          console.warn("[syncDeliveryProgression] Notification warning:", err),
        );

      currentStatus = nextStatus;
      statusTime = transitionTime.getTime();
      elapsed = now - statusTime;

      if (currentStatus === "DELIVERED") {
        await markCodPaymentSuccessOnDelivered(orderId);
        break;
      }
    }

    return orderRepository.findById(orderId);
  },

  /**
   * Called when an order is set to DELIVERED (admin or sync) to settle COD.
   */
  async onOrderDelivered(orderId: string) {
    await markCodPaymentSuccessOnDelivered(orderId);
  },

  /**
   * Customer cancellation for PENDING orders only.
   * Restores stock and marks associated payment FAILED when still pending.
   */
  async cancelPendingOrder(userId: string, orderId: string) {
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true, payment: true },
      });

      if (!order) throw new Error("NOT_FOUND");
      if (order.userId !== userId) throw new Error("FORBIDDEN");
      if (order.status !== "PENDING") throw new Error("ORDER_NOT_CANCELLABLE");

      const cancelled = await tx.order.updateMany({
        where: { id: orderId, status: "PENDING" },
        data: { status: "CANCELLED", statusChangedAt: new Date() },
      });
      if (cancelled.count === 0) {
        throw new Error("ORDER_NOT_CANCELLABLE");
      }

      for (const item of order.items) {
        await tx.$executeRaw`
          UPDATE "Product"
          SET stock = stock + ${item.quantity},
              "updatedAt" = NOW()
          WHERE id = ${item.productId}
        `;
      }

      if (order.payment && order.payment.status !== "SUCCESS") {
        await tx.payment.update({
          where: { id: order.payment.id },
          data: { status: "FAILED", providerStatus: "cancelled_by_customer" },
        });
      }

      return tx.order.findUnique({
        where: { id: orderId },
        include: ORDER_INCLUDE,
      });
    });
  },

  async getOrder(userId: string, orderId: string) {
    await this.syncDeliveryProgression(orderId);

    const order = await orderRepository.findById(orderId);
    if (!order) throw new Error("NOT_FOUND");
    if (order.userId !== userId) throw new Error("FORBIDDEN");
    return order;
  },
};
