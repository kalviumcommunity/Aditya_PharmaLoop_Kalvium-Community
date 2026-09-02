import { prisma } from "@/lib/prisma";
import { AddressInput } from "@/types";

export const addressRepository = {
  async findByUser(userId: string) {
    return prisma.address.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  },

  async findById(id: string) {
    return prisma.address.findUnique({ where: { id } });
  },

  async create(userId: string, data: AddressInput) {
    return prisma.address.create({
      data: { userId, ...data },
    });
  },

  async update(id: string, data: Partial<AddressInput>) {
    return prisma.address.update({
      where: { id },
      data,
    });
  },

  async delete(id: string) {
    return prisma.address.delete({ where: { id } });
  },
};
