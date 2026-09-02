import { withAuth, AuthenticatedRequest } from "@/lib/middleware";
import { notificationService } from "@/services/notification.service";
import { ok, serverError } from "@/lib/response";

export const PATCH = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const result = await notificationService.markAllRead(req.auth.userId);
    return ok(result, "All notifications marked as read");
  } catch (err) {
    console.error("[PATCH /api/notifications/read-all]", err);
    return serverError();
  }
});
