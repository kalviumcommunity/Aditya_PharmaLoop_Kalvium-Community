import { subscriptionRepository } from "@/repositories/subscription.repository";
import { productRepository } from "@/repositories/product.repository";
import { addressRepository } from "@/repositories/address.repository";
import { cartRepository } from "@/repositories/cart.repository";
import { notificationService } from "./notification.service";
import { CreateSubscriptionInput, PatchSubscriptionInput } from "@/types";
import { SubscriptionFrequency } from "@/app/generated/prisma";

/**
 * Compute the next refill date from the current date based on frequency.
 */
function computeNextRefillDate(
  from: Date,
  frequency: SubscriptionFrequency
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
  return next;
}

export const subscriptionService = {
  async createSubscription(userId: string, input: CreateSubscriptionInput) {
    // Validate delivery address exists and belongs to authenticated user
    const address = await addressRepository.findById(input.addressId);
    if (!address || address.userId !== userId) {
      throw new Error("INVALID_ADDRESS");
    }

    // Validate all products exist
    const productIds = input.items.map((i) => i.productId);
    const products = await productRepository.findManyByIds(productIds);
    if (products.length !== productIds.length) {
      throw new Error("PRODUCT_NOT_FOUND");
    }

    // Validate nextRefillDate bounds
    const parsedDate = new Date(input.nextRefillDate);
    if (isNaN(parsedDate.getTime())) {
      throw new Error("INVALID_DATE");
    }
    const minDate = new Date();
    minDate.setHours(0, 0, 0, 0);
    if (parsedDate < minDate) {
      throw new Error("PAST_DATE_NOT_ALLOWED");
    }
    const maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() + 1);
    if (parsedDate > maxDate) {
      throw new Error("DATE_TOO_FAR_IN_FUTURE");
    }

    // Combine date with effective refillTime
    if (input.refillTime && /^\d{2}:\d{2}$/.test(input.refillTime)) {
      const [hours, minutes] = input.refillTime.split(":").map(Number);
      parsedDate.setHours(hours, minutes, 0, 0);
    }
    if (parsedDate < new Date()) {
      throw new Error("PAST_DATE_NOT_ALLOWED");
    }

    // If requested, verify cart and clear atomically with subscription creation
    let clearCartId: string | undefined;
    if (input.clearCart) {
      const cart = await cartRepository.findByUser(userId);
      if (!cart || cart.items.length === 0) {
        throw new Error("CART_EMPTY");
      }
      clearCartId = cart.id;
    }

    const subscription = await subscriptionRepository.create(
      {
        userId,
        addressId: input.addressId,
        frequency: input.frequency,
        nextRefillDate: parsedDate,
        refillTime: input.refillTime,
        items: input.items,
      },
      clearCartId
    );

    // Notify user
    await notificationService.send({
      userId,
      type: "SUBSCRIPTION",
      title: "Subscription Created",
      message: `Your ${input.frequency.toLowerCase()} subscription has been set up. Next refill on ${parsedDate.toLocaleDateString()}.`,
    });

    return subscription;
  },

  async getUserSubscriptions(userId: string) {
    return subscriptionRepository.findByUser(userId);
  },

  async getSubscription(userId: string, subscriptionId: string) {
    const sub = await subscriptionRepository.findById(subscriptionId);
    if (!sub) throw new Error("NOT_FOUND");
    if (sub.userId !== userId) throw new Error("FORBIDDEN");
    return sub;
  },

  async applyAction(
    userId: string,
    subscriptionId: string,
    input: PatchSubscriptionInput
  ) {
    const sub = await subscriptionRepository.findById(subscriptionId);
    if (!sub) throw new Error("NOT_FOUND");
    if (sub.userId !== userId) throw new Error("FORBIDDEN");

    const isScheduleUpdate =
      input.frequency !== undefined ||
      input.nextRefillDate !== undefined ||
      input.refillTime !== undefined;

    // Disallow rescheduling cancelled subscriptions
    if (isScheduleUpdate && sub.status === "CANCELLED") {
      throw new Error("INVALID_STATUS");
    }

    const now = new Date();
    const updateData: Parameters<typeof subscriptionRepository.update>[1] = {};

    // 1. Address update & authorization
    if (input.addressId) {
      const address = await addressRepository.findById(input.addressId);
      if (!address || address.userId !== userId) {
        throw new Error("INVALID_ADDRESS");
      }
      updateData.addressId = input.addressId;
    }

    // 2. Frequency update
    if (input.frequency) {
      updateData.frequency = input.frequency;
    }

    // 3. Refill time update
    if (input.refillTime) {
      updateData.refillTime = input.refillTime;
    }

    // 4. Next refill date validation & combination with time
    if (input.nextRefillDate) {
      const parsedDate = new Date(input.nextRefillDate);
      if (isNaN(parsedDate.getTime())) {
        throw new Error("INVALID_DATE");
      }
      const minDate = new Date();
      minDate.setHours(0, 0, 0, 0);
      if (parsedDate < minDate) {
        throw new Error("PAST_DATE_NOT_ALLOWED");
      }
      const maxDate = new Date();
      maxDate.setFullYear(maxDate.getFullYear() + 1);
      if (parsedDate > maxDate) {
        throw new Error("DATE_TOO_FAR_IN_FUTURE");
      }

      // Combine calendar date with effective refill time
      const effectiveTime = input.refillTime ?? sub.refillTime;
      if (effectiveTime && /^\d{2}:\d{2}$/.test(effectiveTime)) {
        const [hours, minutes] = effectiveTime.split(":").map(Number);
        parsedDate.setHours(hours, minutes, 0, 0);
      }
      updateData.nextRefillDate = parsedDate;
    } else if (input.refillTime) {
      // Time changed without date: preserve calendar date of existing nextRefillDate
      const existingDate = new Date(sub.nextRefillDate);
      const [hours, minutes] = input.refillTime.split(":").map(Number);
      existingDate.setHours(hours, minutes, 0, 0);
      updateData.nextRefillDate = existingDate;
    }

    // 5. Lifecycle actions
    if (input.action) {
      switch (input.action) {
        case "pause": {
          if (sub.status !== "ACTIVE") throw new Error("INVALID_STATUS");
          updateData.status = "PAUSED";
          updateData.pausedAt = now;
          break;
        }

        case "resume": {
          if (sub.status !== "PAUSED") throw new Error("INVALID_STATUS");
          updateData.status = "ACTIVE";
          updateData.pausedAt = null;
          if (!updateData.nextRefillDate) {
            updateData.nextRefillDate = computeNextRefillDate(
              now,
              updateData.frequency ?? sub.frequency
            );
          }
          break;
        }

        case "cancel": {
          if (sub.status === "CANCELLED") throw new Error("INVALID_STATUS");
          updateData.status = "CANCELLED";
          updateData.cancelledAt = now;
          break;
        }

        case "skip": {
          if (sub.status !== "ACTIVE") throw new Error("INVALID_STATUS");
          const baseDate = updateData.nextRefillDate ?? sub.nextRefillDate;
          const freq = updateData.frequency ?? sub.frequency;
          updateData.nextRefillDate = computeNextRefillDate(baseDate, freq);
          break;
        }
      }
    }

    // Persist changes to PostgreSQL
    const updated = await subscriptionRepository.update(subscriptionId, updateData);

    // Send notifications based on the action performed
    if (input.action) {
      if (input.action === "pause") {
        await notificationService.send({
          userId,
          type: "SUBSCRIPTION",
          title: "Subscription Paused",
          message: "Your subscription has been paused. No refills will be generated until you resume.",
        });
      } else if (input.action === "resume") {
        await notificationService.send({
          userId,
          type: "SUBSCRIPTION",
          title: "Subscription Resumed",
          message: `Your subscription is active again. Next refill on ${updated.nextRefillDate.toLocaleDateString()}.`,
        });
      } else if (input.action === "cancel") {
        await notificationService.send({
          userId,
          type: "SUBSCRIPTION",
          title: "Subscription Cancelled",
          message: "Your subscription has been cancelled. No future refills will be generated.",
        });
      } else if (input.action === "skip") {
        await notificationService.send({
          userId,
          type: "SUBSCRIPTION",
          title: "Refill Skipped",
          message: `The next refill has been skipped. Next refill on ${updated.nextRefillDate.toLocaleDateString()}.`,
        });
      }
    } else if (isScheduleUpdate) {
      await notificationService.send({
        userId,
        type: "SUBSCRIPTION",
        title: "Subscription Schedule Updated",
        message: `Your refill schedule has been updated to ${updated.frequency.toLowerCase()}. Next refill on ${updated.nextRefillDate.toLocaleDateString()}.`,
      });
    } else if (updateData.addressId) {
      await notificationService.send({
        userId,
        type: "SUBSCRIPTION",
        title: "Subscription Delivery Address Updated",
        message: "Your delivery address for this subscription has been updated successfully.",
      });
    }

    return updated;
  },

  async cancelSubscription(userId: string, subscriptionId: string) {
    const sub = await subscriptionRepository.findById(subscriptionId);
    if (!sub) throw new Error("NOT_FOUND");
    if (sub.userId !== userId) throw new Error("FORBIDDEN");
    if (sub.status === "CANCELLED") throw new Error("INVALID_STATUS");

    return subscriptionRepository.update(subscriptionId, {
      status: "CANCELLED",
      cancelledAt: new Date(),
    });
  },
};
