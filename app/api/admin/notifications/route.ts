import { withAdminAuth } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { ok, serverError } from "@/lib/response";

export const GET = withAdminAuth(async () => {
  try {
    const now = new Date();

    const [
      lowStockProducts,
      failedPayments,
      dueSubscriptions,
      systemNotifications,
    ] = await Promise.all([
      // 1. Low stock alerts (<= 20 units)
      prisma.product.findMany({
        where: { isActive: true, stock: { lte: 20 } },
        orderBy: { stock: "asc" },
        take: 20,
        select: {
          id: true,
          name: true,
          stock: true,
          price: true,
        },
      }),

      // 2. Failed payment alerts
      prisma.payment.findMany({
        where: { status: "FAILED" },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          orderId: true,
          amount: true,
          createdAt: true,
          order: {
            select: {
              user: {
                select: { name: true, email: true },
              },
            },
          },
          attempts: {
            take: 1,
            orderBy: { createdAt: "desc" },
            select: { failureReason: true },
          },
        },
      }),

      // 3. Overdue refills awaiting worker cycle
      prisma.subscription.findMany({
        where: { status: "ACTIVE", nextRefillDate: { lte: now } },
        orderBy: { nextRefillDate: "asc" },
        take: 20,
        select: {
          id: true,
          nextRefillDate: true,
          refillTime: true,
          frequency: true,
          user: {
            select: { name: true, email: true },
          },
          items: {
            select: {
              product: { select: { name: true } },
              quantity: true,
            },
          },
        },
      }),

      // 4. Operational system platform notifications from the database
      prisma.notification.findMany({
        where: { type: "SYSTEM" },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          type: true,
          title: true,
          message: true,
          createdAt: true,
          user: {
            select: { name: true, email: true },
          },
        },
      }),
    ]);

    return ok({
      summary: {
        lowStockCount: lowStockProducts.length,
        failedPaymentsCount: failedPayments.length,
        dueRefillsCount: dueSubscriptions.length,
        totalAlerts:
          lowStockProducts.length + failedPayments.length + dueSubscriptions.length,
      },
      lowStockProducts,
      failedPayments,
      dueSubscriptions,
      systemNotifications,
    });
  } catch (err) {
    console.error("[GET /api/admin/notifications]", err);
    return serverError();
  }
});
