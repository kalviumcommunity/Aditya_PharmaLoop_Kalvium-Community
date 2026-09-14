import { withAdminAuth, AuthenticatedRequest } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { OrderStatus, Prisma } from "@/app/generated/prisma";
import { ok, serverError } from "@/lib/response";

export const GET = withAdminAuth(async (req: AuthenticatedRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get("status");
    const searchParam = searchParams.get("search");
    const typeParam = searchParams.get("type"); // STOREFRONT | REFILL
    const sortBy =
      searchParams.get("sortBy") === "total" ? "total" : "createdAt";
    const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";

    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "20", 10)),
    );
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {};

    if (
      statusParam &&
      Object.values(OrderStatus).includes(statusParam as OrderStatus)
    ) {
      where.status = statusParam as OrderStatus;
    }

    if (typeParam === "REFILL") {
      where.id = { startsWith: "refill_" };
    } else if (typeParam === "STOREFRONT") {
      where.NOT = { id: { startsWith: "refill_" } };
    }

    if (searchParam && searchParam.trim().length > 0) {
      const q = searchParam.trim();
      where.OR = [
        { id: { contains: q, mode: "insensitive" } },
        { user: { name: { contains: q, mode: "insensitive" } } },
        { user: { email: { contains: q, mode: "insensitive" } } },
      ];
    }

    const [totalCount, orders] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          address: true,
          items: {
            select: {
              id: true,
              quantity: true,
              price: true,
              product: {
                select: { id: true, name: true, price: true, stock: true },
              },
            },
          },
          payment: {
            select: {
              id: true,
              amount: true,
              status: true,
              paymentMethod: true,
              provider: true,
              currency: true,
              providerOrderId: true,
              attempts: {
                select: {
                  id: true,
                  status: true,
                  failureReason: true,
                  createdAt: true,
                },
                orderBy: { createdAt: "desc" },
                take: 3,
              },
            },
          },
        },
      }),
    ]);

    const enriched = orders.map((order) => ({
      ...order,
      isRefill: order.id.startsWith("refill_"),
    }));

    const totalPages = Math.ceil(totalCount / limit);

    return ok({
      items: enriched,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
      },
    });
  } catch (err) {
    console.error("[GET /api/admin/orders]", err);
    return serverError();
  }
});
