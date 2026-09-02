import { prisma } from "@/lib/prisma";
import { Prisma } from "@/app/generated/prisma";
import { cartRepository } from "@/repositories/cart.repository";
import { orderRepository, ORDER_INCLUDE } from "@/repositories/order.repository";
import { addressRepository } from "@/repositories/address.repository";
import { paymentService } from "./payment.service";
import { CreateOrderInput } from "@/types";

export const orderService = {
  /**
   * Creates a one-time order from the user's current cart.
   * Atomically validates stock, decrements stock, creates the order and items,
   * and clears the cart inside a Prisma transaction.
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

    // 3. Compute total and prepare order item details
    const orderItems = cart.items.map((item: (typeof cart.items)[number]) => ({
      productId: item.productId,
      quantity: item.quantity,
      price: item.product.price,
    }));

    const total = orderItems.reduce(
      (sum: Prisma.Decimal, item: { productId: string; quantity: number; price: Prisma.Decimal }) =>
        sum.plus(new Prisma.Decimal(item.price.toString()).times(item.quantity)),
      new Prisma.Decimal(0)
    );

    // 4. Atomic database operations: Stock validation + deduction, Order creation, Cart clearing
    const order = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      for (const item of cart.items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (!product || !product.isActive) {
          throw new Error("INACTIVE_PRODUCTS_IN_CART");
        }

        if (product.stock < item.quantity) {
          throw new Error(
            `INSUFFICIENT_STOCK: ${product.name} only has ${product.stock} available in stock`
          );
        }

        // Deduct product inventory
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        });
      }

      // Create order and order items with address relation
      const createdOrder = await tx.order.create({
        data: {
          userId,
          addressId: input.addressId,
          total,
          items: {
            create: orderItems.map((item: { productId: string; quantity: number; price: Prisma.Decimal }) => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.price,
            })),
          },
        },
        include: ORDER_INCLUDE,
      });

      // Clear cart items
      await tx.cartItem.deleteMany({
        where: { cartId: cart.id },
      });

      return createdOrder;
    });

    // 5. Process payment (updates order status to CONFIRMED if payment succeeds)
    await paymentService.processPayment(order.id, total, userId);

    // 6. Return fresh order from DB with updated status & payment relations
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
