import { prisma } from "@/lib/prisma";

const CART_INCLUDE = {
  items: {
    include: {
      product: true,
    },
    orderBy: { createdAt: "asc" as const },
  },
};

export const cartRepository = {
  /**
   * Returns the existing cart for a user, or creates a new empty one.
   */
  async getOrCreate(userId: string) {
    return prisma.cart.upsert({
      where: { userId },
      create: { userId },
      update: {},
      include: CART_INCLUDE,
    });
  },

  async findByUser(userId: string) {
    return prisma.cart.findUnique({
      where: { userId },
      include: CART_INCLUDE,
    });
  },

  async upsertItem(cartId: string, productId: string, quantity: number) {
    return prisma.cartItem.upsert({
      where: { cartId_productId: { cartId, productId } },
      create: { cartId, productId, quantity },
      update: { quantity },
      include: { product: true },
    });
  },

  async updateItem(itemId: string, quantity: number) {
    return prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity },
      include: { product: true },
    });
  },

  async removeItem(itemId: string) {
    return prisma.cartItem.delete({ where: { id: itemId } });
  },

  async findItem(itemId: string) {
    return prisma.cartItem.findUnique({
      where: { id: itemId },
      include: { cart: true },
    });
  },

  async clearCart(cartId: string) {
    return prisma.cartItem.deleteMany({ where: { cartId } });
  },
};
