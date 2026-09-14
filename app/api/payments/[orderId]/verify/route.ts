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
    if (
      !body ||
      typeof body.razorpayOrderId !== "string" ||
      typeof body.razorpayPaymentId !== "string" ||
      typeof body.razorpaySignature !== "string"
    ) {
      return badRequest("Invalid Razorpay payment response");
    }

    try {
      const payment = await paymentService.verifyRazorpayPayment(
        req.auth.userId,
        orderId,
        body,
      );
      await paymentService.advanceRefillAfterRetry(req.auth.userId, orderId);
      return ok(payment);
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (err.message === "NOT_FOUND")
          return notFound("Order or payment record not found");
        if (err.message === "FORBIDDEN") return forbidden("Access denied");
        if (["INVALID_SIGNATURE", "INVALID_PAYMENT"].includes(err.message))
          return badRequest("Payment verification failed");
        if (err.message === "RAZORPAY_NOT_CONFIGURED")
          return serverError(
            "Razorpay Test Mode is not configured on the server",
          );
      }
      console.error("[POST /api/payments/[orderId]/verify]", err);
      return serverError();
    }
  },
);
