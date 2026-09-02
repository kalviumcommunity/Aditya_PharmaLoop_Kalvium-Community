import { withAuth, AuthenticatedRequest } from "@/lib/middleware";
import { subscriptionService } from "@/services/subscription.service";
import { validateBody } from "@/lib/validate";
import { createSubscriptionSchema } from "@/types";
import { ok, created, badRequest, serverError } from "@/lib/response";

export const GET = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const subscriptions = await subscriptionService.getUserSubscriptions(req.auth.userId);
    return ok(subscriptions);
  } catch (err) {
    console.error("[GET /api/subscriptions]", err);
    return serverError();
  }
});

export const POST = withAuth(async (req: AuthenticatedRequest) => {
  const { data, error } = await validateBody(req, createSubscriptionSchema);
  if (error) return error;

  try {
    const subscription = await subscriptionService.createSubscription(req.auth.userId, data);
    return created(subscription, "Subscription created successfully");
  } catch (err: unknown) {
    if (err instanceof Error) {
      if (err.message === "INVALID_ADDRESS") {
        return badRequest("Invalid or unauthorized delivery address");
      }
      if (err.message === "PRODUCT_NOT_FOUND") {
        return badRequest("One or more products were not found or inactive");
      }
    }
    console.error("[POST /api/subscriptions]", err);
    return serverError();
  }
});
