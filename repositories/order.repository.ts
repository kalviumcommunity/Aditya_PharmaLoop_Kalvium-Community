import { prisma } from "@/lib/prisma";
import { OrderStatus, Prisma } from "@/app/generated/prisma";

export interface CreateOrderData {
  userId: string;
  items: Array<{
    productId: string;
    quantity: number;
    price: Prisma.Decimal;
  }>;
  total: Prisma.Decimal;
}

const ORDER_INCLUDE = {
  items: {
    include: { product: true },
  },
  payment: {
    include: { attempts: { orderBy: { createdAt: "desc" as const } } },
  },
};

export const orderRepository = {
  async create(data: CreateOrderData) {
    return prisma.order.create({
      data: {
        userId: data.userId,
        total: data.total,
        items: {
          create: data.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
          })),
        },
      },
      include: ORDER_INCLUDE,
    });
  },

  async findByUser(userId: string) {
    return prisma.order.findMany({
      where: { userId },
      include: ORDER_INCLUDE,
      orderBy: { createdAt: "desc" },
    });
  },

  async findById(id: string) {
    return prisma.order.findUnique({
      where: { id },
      include: ORDER_INCLUDE,
    });
  },

  async updateStatus(id: string, status: OrderStatus) {
    return prisma.order.update({
      where: { id },
      data: { status },
      include: ORDER_INCLUDE,
    });
  },
};
