import { subscriptionRepository } from "@/repositories/subscription.repository";
import { productRepository } from "@/repositories/product.repository";
import { addressRepository } from "@/repositories/address.repository";
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

    const subscription = await subscriptionRepository.create({
      userId,
      addressId: input.addressId,
      frequency: input.frequency,
      nextRefillDate: new Date(input.nextRefillDate),
      refillTime: input.refillTime,
      items: input.items,
    });

    // Notify user
    await notificationService.send({
      userId,
      type: "SUBSCRIPTION",
      title: "Subscription Created",
      message: `Your ${input.frequency.toLowerCase()} subscription has been set up. Next refill on ${new Date(input.nextRefillDate).toLocaleDateString()}.`,
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

    const now = new Date();
    let addressToUpdate: string | undefined = undefined;

    if (input.addressId) {
      const address = await addressRepository.findById(input.addressId);
      if (!address || address.userId !== userId) {
        throw new Error("INVALID_ADDRESS");
      }
      addressToUpdate = input.addressId;
    }

    if (input.action) {
      switch (input.action) {
        case "pause": {
          if (sub.status !== "ACTIVE") throw new Error("INVALID_STATUS");
          const updated = await subscriptionRepository.update(subscriptionId, {
            status: "PAUSED",
            pausedAt: now,
            ...(addressToUpdate ? { addressId: addressToUpdate } : {}),
          });
          await notificationService.send({
            userId,
            type: "SUBSCRIPTION",
            title: "Subscription Paused",
            message: "Your subscription has been paused. No refills will be generated until you resume.",
          });
          return updated;
        }

        case "resume": {
          if (sub.status !== "PAUSED") throw new Error("INVALID_STATUS");
          // Recalculate next refill from now
          const nextRefillDate = computeNextRefillDate(now, sub.frequency);
          const updated = await subscriptionRepository.update(subscriptionId, {
            status: "ACTIVE",
            pausedAt: null,
            nextRefillDate,
            ...(addressToUpdate ? { addressId: addressToUpdate } : {}),
          });
          await notificationService.send({
            userId,
            type: "SUBSCRIPTION",
            title: "Subscription Resumed",
            message: `Your subscription is active again. Next refill on ${nextRefillDate.toLocaleDateString()}.`,
          });
          return updated;
        }

        case "cancel": {
          if (sub.status === "CANCELLED") throw new Error("INVALID_STATUS");
          const updated = await subscriptionRepository.update(subscriptionId, {
            status: "CANCELLED",
            cancelledAt: now,
            ...(addressToUpdate ? { addressId: addressToUpdate } : {}),
          });
          await notificationService.send({
            userId,
            type: "SUBSCRIPTION",
            title: "Subscription Cancelled",
            message: "Your subscription has been cancelled. No future refills will be generated.",
          });
          return updated;
        }

        case "skip": {
          if (sub.status !== "ACTIVE") throw new Error("INVALID_STATUS");
          // Advance the next refill date by one period
          const nextRefillDate = computeNextRefillDate(sub.nextRefillDate, sub.frequency);
          const updated = await subscriptionRepository.update(subscriptionId, {
            nextRefillDate,
            ...(addressToUpdate ? { addressId: addressToUpdate } : {}),
          });
          await notificationService.send({
            userId,
            type: "SUBSCRIPTION",
            title: "Refill Skipped",
            message: `The next refill has been skipped. Next refill on ${nextRefillDate.toLocaleDateString()}.`,
          });
          return updated;
        }
      }
    }

    if (addressToUpdate) {
      const updated = await subscriptionRepository.update(subscriptionId, {
        addressId: addressToUpdate,
      });
      await notificationService.send({
        userId,
        type: "SUBSCRIPTION",
        title: "Subscription Delivery Address Updated",
        message: "Your delivery address for this subscription has been updated successfully.",
      });
      return updated;
    }

    return sub;
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
