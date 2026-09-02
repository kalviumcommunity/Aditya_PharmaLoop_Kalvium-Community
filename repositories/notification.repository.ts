import { prisma } from "@/lib/prisma";
import { NotificationType } from "@/app/generated/prisma";

export interface CreateNotificationData {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
}

export const notificationRepository = {
  async create(data: CreateNotificationData) {
    return prisma.notification.create({ data });
  },

  async findByUser(userId: string, onlyUnread = false) {
    return prisma.notification.findMany({
      where: {
        userId,
        ...(onlyUnread ? { isRead: false } : {}),
      },
      orderBy: { createdAt: "desc" },
    });
  },

  async findById(id: string) {
    return prisma.notification.findUnique({ where: { id } });
  },

  async markRead(id: string) {
    return prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  },

  async markAllRead(userId: string) {
    return prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  },

  async countUnread(userId: string): Promise<number> {
    return prisma.notification.count({ where: { userId, isRead: false } });
  },
};
