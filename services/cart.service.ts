import { cartRepository } from "@/repositories/cart.repository";
import { productRepository } from "@/repositories/product.repository";
import { AddCartItemInput, UpdateCartItemInput } from "@/types";

export const cartService = {
  async getCart(userId: string) {
    return cartRepository.getOrCreate(userId);
  },

  async addItem(userId: string, input: AddCartItemInput) {
    // Validate product exists and is active
    const product = await productRepository.findById(input.productId);
    if (!product || !product.isActive) {
      throw new Error("PRODUCT_NOT_FOUND");
    }

    const cart = await cartRepository.getOrCreate(userId);
    return cartRepository.upsertItem(cart.id, input.productId, input.quantity);
  },

  async updateItem(userId: string, itemId: string, input: UpdateCartItemInput) {
    const item = await cartRepository.findItem(itemId);
    if (!item) throw new Error("ITEM_NOT_FOUND");
    if (item.cart.userId !== userId) throw new Error("FORBIDDEN");

    return cartRepository.updateItem(itemId, input.quantity);
  },

  async removeItem(userId: string, itemId: string) {
    const item = await cartRepository.findItem(itemId);
    if (!item) throw new Error("ITEM_NOT_FOUND");
    if (item.cart.userId !== userId) throw new Error("FORBIDDEN");

    return cartRepository.removeItem(itemId);
  },
};
