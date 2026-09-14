import { prisma } from "@/lib/prisma";
import { OrderStatus, Prisma } from "@/app/generated/prisma";

export interface CreateOrderData {
  userId: string;
  addressId: string;
  items: Array<{
    productId: string;
    quantity: number;
    price: Prisma.Decimal;
  }>;
  total: Prisma.Decimal;
}

export const ORDER_LIST_INCLUDE = {
  address: true,
  items: {
    include: { product: true },
  },
  payment: {
    include: { attempts: { orderBy: { createdAt: "desc" as const } } },
  },
};

export const ORDER_DETAIL_INCLUDE = {
  ...ORDER_LIST_INCLUDE,
  feedback: true,
};

export const ORDER_INCLUDE = ORDER_DETAIL_INCLUDE;

export const orderRepository = {
  async create(data: CreateOrderData) {
    const now = new Date();
    return prisma.order.create({
      data: {
        userId: data.userId,
        addressId: data.addressId,
        total: data.total,
        statusChangedAt: now,
        items: {
          create: data.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
          })),
        },
      },
      include: ORDER_LIST_INCLUDE,
    });
  },

  async findByUser(userId: string) {
    return prisma.order.findMany({
      where: { userId },
      include: ORDER_LIST_INCLUDE,
      orderBy: { createdAt: "desc" },
    });
  },

  async findById(id: string) {
    return prisma.order.findUnique({
      where: { id },
      include: ORDER_INCLUDE,
    });
  },

  async updateStatus(id: string, status: OrderStatus, statusChangedAt: Date = new Date()) {
    return prisma.order.update({
      where: { id },
      data: {
        status,
        statusChangedAt,
      },
      include: ORDER_INCLUDE,
    });
  },
};
