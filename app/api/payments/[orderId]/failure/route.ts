import { withAuth, AuthenticatedRequest } from "@/lib/middleware";
import { paymentService } from "@/services/payment.service";
import {
  ok,
  notFound,
  forbidden,
  badRequest,
  serverError,
} from "@/lib/response";

type RouteContext = { params: Promise<{ orderId: string }> };

export const POST = withAuth(
  async (req: AuthenticatedRequest, ctx: unknown) => {
    const { orderId } = await (ctx as RouteContext).params;
    const body = await req.json().catch(() => null);
    const providerError =
      body && typeof body === "object"
        ? {
            code:
              typeof body.code === "string"
                ? body.code.slice(0, 100)
                : undefined,
            description:
              typeof body.description === "string"
                ? body.description.slice(0, 500)
                : undefined,
          }
        : undefined;

    try {
      return ok(
        await paymentService.recordRazorpayFailure(
          req.auth.userId,
          orderId,
          providerError,
        ),
      );
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (err.message === "NOT_FOUND")
          return notFound("Order or payment record not found");
        if (err.message === "FORBIDDEN") return forbidden("Access denied");
        if (err.message === "ALREADY_PAID")
          return badRequest("Payment for this order has already succeeded");
      }
      console.error("[POST /api/payments/[orderId]/failure]", err);
      return serverError();
    }
  },
);
