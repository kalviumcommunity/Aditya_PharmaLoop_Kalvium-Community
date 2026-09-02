import { withAuth, AuthenticatedRequest } from "@/lib/middleware";
import { notificationService } from "@/services/notification.service";
import { ok, serverError } from "@/lib/response";

export const GET = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get("unread") === "true";

    const notifications = await notificationService.getUserNotifications(req.auth.userId, unreadOnly);
    const unreadCount = await notificationService.getUnreadCount(req.auth.userId);

    return ok({ notifications, unreadCount });
  } catch (err) {
    console.error("[GET /api/notifications]", err);
    return serverError();
  }
});
