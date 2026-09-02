import { withAuth, AuthenticatedRequest } from "@/lib/middleware";
import { paymentService } from "@/services/payment.service";
import { ok, notFound, forbidden, badRequest, serverError } from "@/lib/response";

type RouteContext = { params: Promise<{ orderId: string }> };

export const POST = withAuth(
  async (req: AuthenticatedRequest, ctx: unknown) => {
    const { orderId } = await (ctx as RouteContext).params;
    try {
      const payment = await paymentService.retryPayment(req.auth.userId, orderId);
      return ok(payment, "Payment retry processed");
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (err.message === "NOT_FOUND") return notFound("Order or payment record not found");
        if (err.message === "FORBIDDEN") return forbidden("Access denied");
        if (err.message === "ALREADY_PAID") return badRequest("Payment for this order has already succeeded");
      }
      console.error("[POST /api/payments/[orderId]/retry]", err);
      return serverError();
    }
  }
);
