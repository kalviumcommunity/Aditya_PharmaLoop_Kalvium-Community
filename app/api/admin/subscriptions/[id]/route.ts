import { withAdminAuth, AuthenticatedRequest } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { ok, notFound, serverError } from "@/lib/response";

type RouteContext = { params: Promise<{ id: string }> };

export const GET = withAdminAuth(
  async (_req: AuthenticatedRequest, ctx: unknown) => {
    const { id } = await (ctx as RouteContext).params;
    try {
      const subscription = await prisma.subscription.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              createdAt: true,
            },
          },
          address: true,
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  price: true,
                  stock: true,
                  isActive: true,
                },
              },
            },
          },
        },
      });

      if (!subscription) {
        return notFound("Subscription not found");
      }

      // Query associated refill orders matching this subscription (prefix: refill_{id})
      const cycleOrders = await prisma.order.findMany({
        where: {
          id: { startsWith: `refill_${id}` },
        },
        orderBy: { createdAt: "desc" },
        include: {
          payment: {
            select: {
              id: true,
              amount: true,
              status: true,
              paymentMethod: true,
            },
          },
        },
        take: 10,
      });

      return ok({
        ...subscription,
        cycleOrders,
      });
    } catch (err) {
      console.error("[GET /api/admin/subscriptions/[id]]", err);
      return serverError();
    }
  }
);
