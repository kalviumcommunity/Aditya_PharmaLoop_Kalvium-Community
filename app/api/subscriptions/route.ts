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
      if (err.message === "CART_EMPTY") {
        return badRequest("Cannot create subscription from an empty cart");
      }
      if (err.message === "PAST_DATE_NOT_ALLOWED") {
        return badRequest("PAST_DATE_NOT_ALLOWED");
      }
      if (err.message === "DATE_TOO_FAR_IN_FUTURE") {
        return badRequest("DATE_TOO_FAR_IN_FUTURE");
      }
      if (err.message === "INVALID_DATE") {
        return badRequest("INVALID_DATE");
      }
    }
    console.error("[POST /api/subscriptions]", err);
    return serverError();
  }
});
