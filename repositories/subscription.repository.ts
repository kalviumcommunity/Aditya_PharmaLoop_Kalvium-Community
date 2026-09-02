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

export const subscriptionRepository = {
  async create(data: CreateSubscriptionData) {
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
      nextRefillDate: Date;
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
   * Find all subscriptions due for a refill (nextRefillDate <= now, status=ACTIVE).
   */
  async findDue() {
    return prisma.subscription.findMany({
      where: {
        status: "ACTIVE",
        nextRefillDate: { lte: new Date() },
      },
      include: SUBSCRIPTION_INCLUDE,
    });
  },
};
