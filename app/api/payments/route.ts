import { withAuth, AuthenticatedRequest } from "@/lib/middleware";
import { paymentService } from "@/services/payment.service";
import { ok, serverError } from "@/lib/response";

export const GET = withAuth(async (req: AuthenticatedRequest) => {
  try {
    return ok(await paymentService.getPaymentHistory(req.auth.userId));
  } catch (error) {
    console.error("[GET /api/payments]", error);
    return serverError();
  }
});
