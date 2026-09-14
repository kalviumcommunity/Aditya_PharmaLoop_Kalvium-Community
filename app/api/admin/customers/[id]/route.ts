import { withAdminAuth, AuthenticatedRequest } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { ok, notFound, serverError } from "@/lib/response";

type RouteContext = { params: Promise<{ id: string }> };

export const GET = withAdminAuth(
  async (_req: AuthenticatedRequest, ctx: unknown) => {
    const { id } = await (ctx as RouteContext).params;
    try {
      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          emailVerifiedAt: true,
          createdAt: true,
          updatedAt: true,
          addresses: {
            orderBy: { createdAt: "desc" },
          },
          subscriptions: {
            orderBy: { createdAt: "desc" },
            include: {
              items: {
                include: { product: true },
              },
            },
          },
          orders: {
            orderBy: { createdAt: "desc" },
            take: 20,
            include: {
              items: {
                include: { product: true },
              },
              payment: {
                select: {
                  id: true,
                  amount: true,
                  status: true,
                  paymentMethod: true,
                },
              },
            },
          },
        },
      });

      if (!user) {
        return notFound("Customer not found");
      }

      return ok(user);
    } catch (err) {
      console.error("[GET /api/admin/customers/[id]]", err);
      return serverError();
    }
  }
);
