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
    try {
      const checkout = await paymentService.retryPayment(
        req.auth.userId,
        orderId,
      );
      return ok(checkout, "Razorpay payment retry created");
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (err.message === "NOT_FOUND")
          return notFound("Order or payment record not found");
        if (err.message === "FORBIDDEN") return forbidden("Access denied");
        if (err.message === "ALREADY_PAID")
          return badRequest("Payment for this order has already succeeded");
        if (err.message === "RETRY_LIMIT_EXCEEDED")
          return badRequest("Payment retry limit exceeded");
        if (err.message === "ORDER_NOT_PAYABLE")
          return badRequest("This order is not payable");
        if (err.message === "COD_NOT_PAYABLE_ONLINE")
          return badRequest("Cash on Delivery orders cannot be paid online");
        if (
          ["RAZORPAY_NOT_CONFIGURED", "RAZORPAY_TEST_KEY_REQUIRED"].includes(
            err.message,
          )
        ) {
          return serverError(
            "Razorpay Test Mode is not configured on the server",
          );
        }
      }
      console.error("[POST /api/payments/[orderId]/retry]", err);
      return serverError();
    }
  },
);
