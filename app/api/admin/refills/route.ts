import { withAdminAuth } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { getRefillCycleOrderId } from "@/services/refill.service";
import { ok, serverError } from "@/lib/response";

export const GET = withAdminAuth(async () => {
  try {
    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [
      activeSubscriptionsCount,
      dueNowCount,
      upcoming7DaysCount,
      failedCyclesCount,
      dueSubscriptionsRaw,
      upcomingSubscriptionsRaw,
      recentRefillOrdersRaw,
    ] = await Promise.all([
      prisma.subscription.count({ where: { status: "ACTIVE" } }),
      prisma.subscription.count({
        where: { status: "ACTIVE", nextRefillDate: { lte: now } },
      }),
      prisma.subscription.count({
        where: {
          status: "ACTIVE",
          nextRefillDate: { gt: now, lte: in7Days },
        },
      }),
      prisma.payment.count({
        where: {
          status: "FAILED",
          orderId: { startsWith: "refill_" },
        },
      }),
      // 1. Due subscriptions
      prisma.subscription.findMany({
        where: { status: "ACTIVE", nextRefillDate: { lte: now } },
        orderBy: { nextRefillDate: "asc" },
        take: 50,
        include: {
          user: { select: { id: true, name: true, email: true } },
          address: true,
          items: { include: { product: true } },
        },
      }),
      // 2. Upcoming subscriptions in the next 7 days
      prisma.subscription.findMany({
        where: {
          status: "ACTIVE",
          nextRefillDate: { gt: now, lte: in7Days },
        },
        orderBy: { nextRefillDate: "asc" },
        take: 50,
        include: {
          user: { select: { id: true, name: true, email: true } },
          address: true,
          items: { include: { product: true } },
        },
      }),
      // 3. Recent Refill Cycle Orders
      prisma.order.findMany({
        where: { id: { startsWith: "refill_" } },
        orderBy: { createdAt: "desc" },
        take: 15,
        include: {
          user: { select: { id: true, name: true, email: true } },
          payment: {
            select: {
              id: true,
              amount: true,
              status: true,
              paymentMethod: true,
            },
          },
        },
      }),
    ]);

    // Pre-fetch all cycle orders in a single batch to eliminate N+1 queries
    const dueCycleOrderIds = dueSubscriptionsRaw.map((sub) =>
      getRefillCycleOrderId(sub.id, sub.nextRefillDate)
    );
    const existingCycleOrders = await prisma.order.findMany({
      where: { id: { in: dueCycleOrderIds } },
      include: {
        payment: {
          select: { id: true, status: true, amount: true },
        },
      },
    });
    const cycleOrderMap = new Map(
      existingCycleOrders.map((ord) => [ord.id, ord])
    );

    // Attach cycle order lookup for due subscriptions
    const dueSubscriptions = dueSubscriptionsRaw.map((sub) => {
      const cycleOrderId = getRefillCycleOrderId(sub.id, sub.nextRefillDate);
      const cycleOrder = cycleOrderMap.get(cycleOrderId);

      return {
        id: sub.id,
        cycleOrderId,
        customer: sub.user.name,
        customerEmail: sub.user.email,
        medicines: sub.items
          .map((i) => `${i.product.name} (×${i.quantity})`)
          .join(", "),
        frequency: sub.frequency,
        scheduledDate: sub.nextRefillDate.toISOString(),
        refillTime: sub.refillTime,
        cycleOrderStatus: cycleOrder?.status ?? "AWAITING_WORKER",
        paymentStatus: cycleOrder?.payment?.status ?? "SCHEDULED",
      };
    });

    const upcomingSubscriptions = upcomingSubscriptionsRaw.map((sub) => ({
      id: sub.id,
      customer: sub.user.name,
      customerEmail: sub.user.email,
      medicines: sub.items
        .map((i) => `${i.product.name} (×${i.quantity})`)
        .join(", "),
      frequency: sub.frequency,
      scheduledDate: sub.nextRefillDate.toISOString(),
      refillTime: sub.refillTime,
    }));

    return ok({
      metrics: {
        activeSubscriptionsCount,
        dueNowCount,
        upcoming7DaysCount,
        failedCyclesCount,
      },
      dueSubscriptions,
      upcomingSubscriptions,
      recentRefillOrders: recentRefillOrdersRaw,
    });
  } catch (err) {
    console.error("[GET /api/admin/refills]", err);
    return serverError();
  }
});
