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
      return ok(
        await paymentService.createRazorpayOrder(req.auth.userId, orderId),
      );
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (err.message === "NOT_FOUND")
          return notFound("Order or payment record not found");
        if (err.message === "FORBIDDEN") return forbidden("Access denied");
        if (["ALREADY_PAID", "ORDER_NOT_PAYABLE"].includes(err.message))
          return badRequest(err.message);
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
      console.error("[POST /api/payments/[orderId]/razorpay-order]", err);
      return serverError();
    }
  },
);
