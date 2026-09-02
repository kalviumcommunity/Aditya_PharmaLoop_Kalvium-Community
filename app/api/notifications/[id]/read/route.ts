import { withAuth, AuthenticatedRequest } from "@/lib/middleware";
import { notificationService } from "@/services/notification.service";
import { ok, notFound, forbidden, serverError } from "@/lib/response";

type RouteContext = { params: Promise<{ id: string }> };

export const PATCH = withAuth(
  async (req: AuthenticatedRequest, ctx: unknown) => {
    const { id } = await (ctx as RouteContext).params;
    try {
      const updated = await notificationService.markRead(req.auth.userId, id);
      return ok(updated, "Notification marked as read");
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (err.message === "NOT_FOUND") return notFound("Notification not found");
        if (err.message === "FORBIDDEN") return forbidden("Access denied");
      }
      console.error("[PATCH /api/notifications/[id]/read]", err);
      return serverError();
    }
  }
);
