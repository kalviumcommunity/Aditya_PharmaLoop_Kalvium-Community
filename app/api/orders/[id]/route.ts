import { withAuth, AuthenticatedRequest } from "@/lib/middleware";
import { orderService } from "@/services/order.service";
import { ok, notFound, forbidden, serverError } from "@/lib/response";

type RouteContext = { params: Promise<{ id: string }> };

export const GET = withAuth(
  async (req: AuthenticatedRequest, ctx: unknown) => {
    const { id } = await (ctx as RouteContext).params;
    try {
      const order = await orderService.getOrder(req.auth.userId, id);
      return ok(order);
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (err.message === "NOT_FOUND") return notFound("Order not found");
        if (err.message === "FORBIDDEN") return forbidden("Access denied");
      }
      console.error("[GET /api/orders/[id]]", err);
      return serverError();
    }
  }
);
