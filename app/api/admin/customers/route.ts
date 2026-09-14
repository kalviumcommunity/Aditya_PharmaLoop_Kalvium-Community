import { withAdminAuth, AuthenticatedRequest } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/app/generated/prisma";
import { ok, serverError } from "@/lib/response";

export const GET = withAdminAuth(async (req: AuthenticatedRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const searchParam = searchParams.get("search");

    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {
      role: "CUSTOMER",
    };

    if (searchParam && searchParam.trim().length > 0) {
      const q = searchParam.trim();
      where.AND = [
        {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { phone: { contains: q, mode: "insensitive" } },
          ],
        },
      ];
    }

    const [totalCount, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          emailVerifiedAt: true,
          createdAt: true,
          _count: {
            select: {
              orders: true,
              subscriptions: true,
            },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return ok({
      items: users,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
      },
    });
  } catch (err) {
    console.error("[GET /api/admin/customers]", err);
    return serverError();
  }
});
