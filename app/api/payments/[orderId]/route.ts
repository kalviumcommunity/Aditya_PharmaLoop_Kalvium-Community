import { withAuth, AuthenticatedRequest } from "@/lib/middleware";
import { paymentService } from "@/services/payment.service";
import { ok, notFound, forbidden, serverError } from "@/lib/response";

type RouteContext = { params: Promise<{ orderId: string }> };

export const GET = withAuth(
  async (req: AuthenticatedRequest, ctx: unknown) => {
    const { orderId } = await (ctx as RouteContext).params;
    try {
      const payment = await paymentService.getPaymentByOrder(req.auth.userId, orderId);
      return ok(payment);
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (err.message === "NOT_FOUND") return notFound("Payment record not found");
        if (err.message === "FORBIDDEN") return forbidden("Access denied");
      }
      console.error("[GET /api/payments/[orderId]]", err);
      return serverError();
    }
  }
);
