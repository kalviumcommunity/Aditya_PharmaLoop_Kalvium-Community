import { withAdminAuth, AuthenticatedRequest } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { PaymentStatus, PaymentMethod, Prisma } from "@/app/generated/prisma";
import { ok, serverError } from "@/lib/response";

export const GET = withAdminAuth(async (req: AuthenticatedRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const searchParam = searchParams.get("search");
    const statusParam = searchParams.get("status");
    const methodParam = searchParams.get("method");

    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const skip = (page - 1) * limit;

    const where: Prisma.PaymentWhereInput = {};

    if (
      statusParam &&
      Object.values(PaymentStatus).includes(statusParam as PaymentStatus)
    ) {
      where.status = statusParam as PaymentStatus;
    }

    if (
      methodParam &&
      Object.values(PaymentMethod).includes(methodParam as PaymentMethod)
    ) {
      where.paymentMethod = methodParam as PaymentMethod;
    }

    if (searchParam && searchParam.trim().length > 0) {
      const q = searchParam.trim();
      where.OR = [
        { id: { contains: q, mode: "insensitive" } },
        { orderId: { contains: q, mode: "insensitive" } },
        { providerOrderId: { contains: q, mode: "insensitive" } },
        { order: { user: { name: { contains: q, mode: "insensitive" } } } },
        { order: { user: { email: { contains: q, mode: "insensitive" } } } },
      ];
    }

    const [totalCount, payments] = await Promise.all([
      prisma.payment.count({ where }),
      prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          orderId: true,
          amount: true,
          status: true,
          paymentMethod: true,
          provider: true,
          currency: true,
          providerOrderId: true,
          createdAt: true,
          updatedAt: true,
          order: {
            select: {
              id: true,
              status: true,
              total: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
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
      }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return ok({
      items: payments,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
      },
    });
  } catch (err) {
    console.error("[GET /api/admin/payments]", err);
    return serverError();
  }
});
