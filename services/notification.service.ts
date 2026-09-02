import { notificationRepository, CreateNotificationData } from "@/repositories/notification.repository";

export const notificationService = {
  /**
   * Creates a notification. Errors are intentionally swallowed so that
   * a notification failure never corrupts business state (PRD §19).
   */
  async send(data: CreateNotificationData) {
    try {
      return await notificationRepository.create(data);
    } catch (err) {
      console.error("[NotificationService] Failed to create notification:", err);
      // Deliberate: do not re-throw — business outcome must not be affected
    }
  },

  async getUserNotifications(userId: string, onlyUnread = false) {
    return notificationRepository.findByUser(userId, onlyUnread);
  },

  async markRead(userId: string, notificationId: string) {
    const notification = await notificationRepository.findById(notificationId);
    if (!notification) throw new Error("NOT_FOUND");
    if (notification.userId !== userId) throw new Error("FORBIDDEN");
    return notificationRepository.markRead(notificationId);
  },

  async markAllRead(userId: string) {
    const result = await notificationRepository.markAllRead(userId);
    return { count: result.count };
  },

  async getUnreadCount(userId: string) {
    return notificationRepository.countUnread(userId);
  },
};
