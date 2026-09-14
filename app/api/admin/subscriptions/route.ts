import { withAdminAuth, AuthenticatedRequest } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { SubscriptionStatus, SubscriptionFrequency, Prisma } from "@/app/generated/prisma";
import { ok, serverError } from "@/lib/response";

export const GET = withAdminAuth(async (req: AuthenticatedRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const searchParam = searchParams.get("search");
    const statusParam = searchParams.get("status");
    const freqParam = searchParams.get("frequency");

    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const skip = (page - 1) * limit;

    const where: Prisma.SubscriptionWhereInput = {};

    if (
      statusParam &&
      Object.values(SubscriptionStatus).includes(statusParam as SubscriptionStatus)
    ) {
      where.status = statusParam as SubscriptionStatus;
    }

    if (
      freqParam &&
      Object.values(SubscriptionFrequency).includes(freqParam as SubscriptionFrequency)
    ) {
      where.frequency = freqParam as SubscriptionFrequency;
    }

    if (searchParam && searchParam.trim().length > 0) {
      const q = searchParam.trim();
      where.OR = [
        { id: { contains: q, mode: "insensitive" } },
        { user: { name: { contains: q, mode: "insensitive" } } },
        { user: { email: { contains: q, mode: "insensitive" } } },
      ];
    }

    const [totalCount, subscriptions] = await Promise.all([
      prisma.subscription.count({ where }),
      prisma.subscription.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: "desc" },
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
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  price: true,
                  stock: true,
                },
              },
            },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return ok({
      items: subscriptions,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
      },
    });
  } catch (err) {
    console.error("[GET /api/admin/subscriptions]", err);
    return serverError();
  }
});
