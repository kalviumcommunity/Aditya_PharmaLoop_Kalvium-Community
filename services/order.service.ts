import { Prisma } from "@/app/generated/prisma";
import { cartRepository } from "@/repositories/cart.repository";
import { orderRepository } from "@/repositories/order.repository";
import { addressRepository } from "@/repositories/address.repository";
import { paymentService } from "./payment.service";
import { CreateOrderInput } from "@/types";

export const orderService = {
  /**
   * Creates a one-time order from the user's current cart.
   * Clears the cart after the order is created.
   */
  async createOneTimeOrder(userId: string, input: CreateOrderInput) {
    // 1. Validate delivery address exists and belongs to user
    const address = await addressRepository.findById(input.addressId);
    if (!address || address.userId !== userId) {
      throw new Error("INVALID_ADDRESS");
    }

    // 2. Fetch user's cart
    const cart = await cartRepository.findByUser(userId);
    if (!cart || cart.items.length === 0) {
      throw new Error("CART_EMPTY");
    }

    // 3. Verify all items in cart are active products
    const inactiveItems = cart.items.filter((item) => !item.product.isActive);
    if (inactiveItems.length > 0) {
      throw new Error("INACTIVE_PRODUCTS_IN_CART");
    }

    // 4. Compute total from current product prices
    const orderItems = cart.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      price: item.product.price,
    }));

    const total = orderItems.reduce(
      (sum: Prisma.Decimal, item: { productId: string; quantity: number; price: Prisma.Decimal }) =>
        sum.plus(new Prisma.Decimal(item.price.toString()).times(item.quantity)),
      new Prisma.Decimal(0)
    );

    // 5. Create order
    const order = await orderRepository.create({
      userId,
      items: orderItems,
      total,
    });

    // 6. Clear cart after order creation
    await cartRepository.clearCart(cart.id);

    // 7. Process payment (updates order status to CONFIRMED if payment succeeds)
    await paymentService.processPayment(order.id, total, userId);

    // 8. Return fresh order from DB with updated status & payment relations
    const updatedOrder = await orderRepository.findById(order.id);
    return updatedOrder ?? order;
  },

  async getOrders(userId: string) {
    return orderRepository.findByUser(userId);
  },

  async getOrder(userId: string, orderId: string) {
    const order = await orderRepository.findById(orderId);
    if (!order) throw new Error("NOT_FOUND");
    if (order.userId !== userId) throw new Error("FORBIDDEN");
    return order;
  },
};
