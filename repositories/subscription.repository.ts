import { prisma } from "@/lib/prisma";
import { SubscriptionFrequency, SubscriptionStatus } from "@/app/generated/prisma";

export interface CreateSubscriptionData {
  userId: string;
  addressId: string;
  frequency: SubscriptionFrequency;
  nextRefillDate: Date;
  refillTime: string;
  items: Array<{ productId: string; quantity: number }>;
}

export const SUBSCRIPTION_INCLUDE = {
  address: true,
  items: {
    include: { product: true },
  },
  user: {
    select: { id: true, name: true, email: true },
  },
};

/**
 * Determines whether an active subscription is due based on persisted nextRefillDate + refillTime.
 */
export function isSubscriptionDue(
  sub: {
    nextRefillDate: Date;
    refillTime?: string | null;
    status: SubscriptionStatus | string;
  },
  asOf: Date = new Date()
): boolean {
  if (sub.status !== "ACTIVE") return false;

  const dueDateTime = new Date(sub.nextRefillDate);
  if (sub.refillTime && /^\d{2}:\d{2}$/.test(sub.refillTime)) {
    const [hours, minutes] = sub.refillTime.split(":").map(Number);
    dueDateTime.setHours(hours, minutes, 0, 0);
  }

  return dueDateTime <= asOf;
}

export const subscriptionRepository = {
  async create(data: CreateSubscriptionData, clearCartId?: string) {
    if (clearCartId) {
      return prisma.$transaction(async (tx) => {
        const sub = await tx.subscription.create({
          data: {
            userId: data.userId,
            addressId: data.addressId,
            frequency: data.frequency,
            nextRefillDate: data.nextRefillDate,
            refillTime: data.refillTime,
            items: {
              create: data.items.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
              })),
            },
          },
          include: SUBSCRIPTION_INCLUDE,
        });

        const deleted = await tx.cartItem.deleteMany({
          where: { cartId: clearCartId },
        });

        if (deleted.count === 0) {
          throw new Error("CART_EMPTY");
        }

        return sub;
      });
    }

    return prisma.subscription.create({
      data: {
        userId: data.userId,
        addressId: data.addressId,
        frequency: data.frequency,
        nextRefillDate: data.nextRefillDate,
        refillTime: data.refillTime,
        items: {
          create: data.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
        },
      },
      include: SUBSCRIPTION_INCLUDE,
    });
  },

  async findByUser(userId: string) {
    return prisma.subscription.findMany({
      where: { userId },
      include: SUBSCRIPTION_INCLUDE,
      orderBy: { createdAt: "desc" },
    });
  },

  async findById(id: string) {
    return prisma.subscription.findUnique({
      where: { id },
      include: SUBSCRIPTION_INCLUDE,
    });
  },

  async update(
    id: string,
    data: Partial<{
      addressId: string;
      status: SubscriptionStatus;
      frequency: SubscriptionFrequency;
      nextRefillDate: Date;
      refillTime: string;
      pausedAt: Date | null;
      cancelledAt: Date | null;
    }>
  ) {
    return prisma.subscription.update({
      where: { id },
      data,
      include: SUBSCRIPTION_INCLUDE,
    });
  },

  /**
   * Find all subscriptions due for a refill (status=ACTIVE, nextRefillDate + refillTime <= asOf).
   */
  async findDue(asOf: Date = new Date()) {
    const maxDate = new Date(asOf);
    maxDate.setHours(23, 59, 59, 999);

    const candidates = await prisma.subscription.findMany({
      where: {
        status: "ACTIVE",
        nextRefillDate: { lte: maxDate },
      },
      include: SUBSCRIPTION_INCLUDE,
    });

    return candidates.filter((sub) => isSubscriptionDue(sub, asOf));
  },
};
