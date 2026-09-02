import { prisma } from "@/lib/prisma";

export interface ProductListOptions {
  search?: string;
  page?: number;
  limit?: number;
  onlyActive?: boolean;
}

export const productRepository = {
  async findAll(opts: ProductListOptions = {}) {
    const { search, page = 1, limit = 20, onlyActive = true } = opts;
    const skip = (page - 1) * limit;

    const where = {
      ...(onlyActive ? { isActive: true } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              { description: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [items, total] = await prisma.$transaction([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: "asc" },
      }),
      prisma.product.count({ where }),
    ]);

    return { items, total };
  },

  async findById(id: string) {
    return prisma.product.findUnique({ where: { id } });
  },

  async findManyByIds(ids: string[]) {
    return prisma.product.findMany({ where: { id: { in: ids }, isActive: true } });
  },
};
