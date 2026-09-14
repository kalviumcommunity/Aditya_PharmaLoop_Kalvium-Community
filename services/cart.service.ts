import { cartRepository } from "@/repositories/cart.repository";
import { productRepository } from "@/repositories/product.repository";
import { AddCartItemInput, UpdateCartItemInput } from "@/types";

export const cartService = {
  async getCart(userId: string) {
    return cartRepository.getOrCreate(userId);
  },

  async addItem(userId: string, input: AddCartItemInput) {
    const product = await productRepository.findById(input.productId);
    if (!product || !product.isActive) {
      throw new Error("PRODUCT_NOT_FOUND");
    }

    const cart = await cartRepository.getOrCreate(userId);
    const existing = cart.items.find((i) => i.productId === input.productId);
    const nextQty = (existing?.quantity ?? 0) + input.quantity;

    if (product.stock < nextQty) {
      throw new Error(
        `INSUFFICIENT_STOCK: Only ${product.stock} available in stock`,
      );
    }

    return cartRepository.upsertItem(cart.id, input.productId, input.quantity);
  },

  async updateItem(userId: string, itemId: string, input: UpdateCartItemInput) {
    const item = await cartRepository.findItem(itemId);
    if (!item) throw new Error("ITEM_NOT_FOUND");
    if (item.cart.userId !== userId) throw new Error("FORBIDDEN");

    const product = await productRepository.findById(item.productId);
    if (!product || !product.isActive) {
      throw new Error("PRODUCT_NOT_FOUND");
    }
    if (product.stock < input.quantity) {
      throw new Error(
        `INSUFFICIENT_STOCK: Only ${product.stock} available in stock`,
      );
    }

    return cartRepository.updateItem(itemId, input.quantity);
  },

  async removeItem(userId: string, itemId: string) {
    const item = await cartRepository.findItem(itemId);
    if (!item) throw new Error("ITEM_NOT_FOUND");
    if (item.cart.userId !== userId) throw new Error("FORBIDDEN");

    return cartRepository.removeItem(itemId);
  },
};
