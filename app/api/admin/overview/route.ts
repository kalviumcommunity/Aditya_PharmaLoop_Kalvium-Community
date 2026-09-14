import { withAdminAuth } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { getRefillCycleOrderId } from "@/services/refill.service";
import { ok, serverError } from "@/lib/response";

export const GET = withAdminAuth(async () => {
  try {
    const now = new Date();

    // 1. Live database metric aggregations
    const [
      activeSubscriptions,
      pendingRefillsDue,
      totalOrders,
      lowStockCount,
      fulfillmentBacklog,
      totalCustomers,
      failedPaymentsCount,
    ] = await Promise.all([
      prisma.subscription.count({
        where: { status: "ACTIVE" },
      }),
      prisma.subscription.count({
        where: {
          status: "ACTIVE",
          nextRefillDate: { lte: now },
        },
      }),
      prisma.order.count(),
      prisma.product.count({
        where: {
          isActive: true,
          stock: { lte: 20 },
        },
      }),
      prisma.order.count({
        where: {
          status: { in: ["PENDING", "CONFIRMED", "PROCESSING"] },
        },
      }),
      prisma.user.count({
        where: { role: "CUSTOMER" },
      }),
      prisma.payment.count({
        where: { status: "FAILED" },
      }),
    ]);

    // 2. Recent Storefront / Platform Orders (latest 10)
    const recentOrders = await prisma.order.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        address: true,
        items: {
          include: {
            product: true,
          },
        },
        payment: {
          select: {
            id: true,
            amount: true,
            status: true,
            paymentMethod: true,
            providerOrderId: true,
            attempts: {
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
        },
      },
    });

    // 3. Subscriptions for refill observability queue
    const subscriptions = await prisma.subscription.findMany({
      where: { status: "ACTIVE" },
      take: 20,
      orderBy: { nextRefillDate: "asc" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        address: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    // Pre-fetch all cycle orders in a single batch to eliminate N+1 queries
    const cycleOrderIds = subscriptions.map((sub) =>
      getRefillCycleOrderId(sub.id, sub.nextRefillDate)
    );
    const existingOrders = await prisma.order.findMany({
      where: { id: { in: cycleOrderIds } },
      include: {
        payment: {
          select: {
            id: true,
            status: true,
            attempts: {
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
        },
      },
    });
    const orderMap = new Map(existingOrders.map((ord) => [ord.id, ord]));

    // Compute observational refill status for each subscription
    const refillQueue = subscriptions.map((sub) => {
      let observationalStatus = "Waiting for Scheduled Date";
      let autoPayStatus = "Pending Scheduled Date";
      let badgeColor = "blue";
      let isDue = false;

      const cycleOrderId = getRefillCycleOrderId(sub.id, sub.nextRefillDate);
      const existingOrder = orderMap.get(cycleOrderId);

        if (sub.status === "PAUSED") {
          observationalStatus = "Paused by Customer";
          autoPayStatus = "Subscription Paused";
          badgeColor = "amber";
        } else if (sub.status === "CANCELLED") {
          observationalStatus = "Cancelled";
          autoPayStatus = "Subscription Inactive";
          badgeColor = "slate";
        } else if (sub.nextRefillDate <= now) {
          isDue = true;
          if (existingOrder) {
            const lastAttempt = existingOrder.payment?.attempts?.[0];
            if (existingOrder.payment?.status === "SUCCESS") {
              observationalStatus = "Processed (Paid)";
              autoPayStatus = "Verified (Paid)";
              badgeColor = "emerald";
            } else if (
              existingOrder.payment?.status === "FAILED" ||
              lastAttempt?.status === "FAILED"
            ) {
              observationalStatus = "Payment Failed";
              autoPayStatus = "Payment Failed";
              badgeColor = "rose";
            } else {
              observationalStatus = "Processing";
              autoPayStatus = "In Progress";
              badgeColor = "amber";
            }
          } else {
            observationalStatus = "Due";
            autoPayStatus = "Due (Waiting Automatic Worker)";
            badgeColor = "amber";
          }
        } else {
          observationalStatus = "Waiting for Scheduled Date";
          autoPayStatus = "Scheduled";
          badgeColor = "slate";
        }

        return {
          id: sub.id,
          cycleOrderId,
          customer: sub.user.name,
          customerEmail: sub.user.email,
          medicines: sub.items
            .map((item) => `${item.product.name} (×${item.quantity})`)
            .join(", "),
          frequency: sub.frequency,
          scheduledDate: sub.nextRefillDate.toISOString(),
          refillTime: sub.refillTime,
          autoPayStatus,
          observationalStatus,
          badgeColor,
          isDue,
          subscriptionStatus: sub.status,
        };
      });

    const formattedRecentOrders = recentOrders.map((ord) => ({
      id: ord.id,
      customer: ord.user.name,
      customerEmail: ord.user.email,
      medicines: ord.items
        .map((item) => `${item.product.name} (×${item.quantity})`)
        .join(", "),
      itemCount: ord.items.length,
      amount: ord.total.toString(),
      status: ord.status,
      createdAt: ord.createdAt.toISOString(),
      isRefill: ord.id.startsWith("refill_"),
    }));

    return ok({
      metrics: {
        activeSubscriptions,
        pendingRefillsDue,
        totalOrders,
        lowStockCount,
        fulfillmentBacklog,
        totalCustomers,
        failedPaymentsCount,
      },
      refillQueue,
      recentOrders: formattedRecentOrders,
    });
  } catch (err) {
    console.error("[GET /api/admin/overview]", err);
    return serverError();
  }
});
