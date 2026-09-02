import { withAuth, AuthenticatedRequest } from "@/lib/middleware";
import { subscriptionService } from "@/services/subscription.service";
import { validateBody } from "@/lib/validate";
import { patchSubscriptionSchema } from "@/types";
import { ok, notFound, forbidden, badRequest, serverError } from "@/lib/response";

type RouteContext = { params: Promise<{ id: string }> };

export const GET = withAuth(
  async (req: AuthenticatedRequest, ctx: unknown) => {
    const { id } = await (ctx as RouteContext).params;
    try {
      const subscription = await subscriptionService.getSubscription(req.auth.userId, id);
      return ok(subscription);
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (err.message === "NOT_FOUND") return notFound("Subscription not found");
        if (err.message === "FORBIDDEN") return forbidden("Access denied");
      }
      console.error("[GET /api/subscriptions/[id]]", err);
      return serverError();
    }
  }
);

export const PATCH = withAuth(
  async (req: AuthenticatedRequest, ctx: unknown) => {
    const { id } = await (ctx as RouteContext).params;
    const { data, error } = await validateBody(req, patchSubscriptionSchema);
    if (error) return error;

    try {
      const updated = await subscriptionService.applyAction(req.auth.userId, id, data);
      return ok(updated, `Subscription action '${data.action}' applied`);
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (err.message === "NOT_FOUND") return notFound("Subscription not found");
        if (err.message === "FORBIDDEN") return forbidden("Access denied");
        if (err.message === "INVALID_STATUS") return badRequest("Action not allowed for current subscription status");
      }
      console.error("[PATCH /api/subscriptions/[id]]", err);
      return serverError();
    }
  }
);

export const DELETE = withAuth(
  async (req: AuthenticatedRequest, ctx: unknown) => {
    const { id } = await (ctx as RouteContext).params;

    try {
      const cancelled = await subscriptionService.cancelSubscription(req.auth.userId, id);
      return ok(cancelled, "Subscription cancelled");
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (err.message === "NOT_FOUND") return notFound("Subscription not found");
        if (err.message === "FORBIDDEN") return forbidden("Access denied");
        if (err.message === "INVALID_STATUS") return badRequest("Subscription is already cancelled");
      }
      console.error("[DELETE /api/subscriptions/[id]]", err);
      return serverError();
    }
  }
);
