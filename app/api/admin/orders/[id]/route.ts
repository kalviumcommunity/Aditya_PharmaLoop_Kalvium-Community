import { withAdminAuth, AuthenticatedRequest } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { OrderStatus } from "@/app/generated/prisma";
import { validateBody } from "@/lib/validate";
import { updateOrderStatusSchema } from "@/types";
import { orderRepository } from "@/repositories/order.repository";
import { orderService } from "@/services/order.service";
import { notificationService } from "@/services/notification.service";
import { ok, badRequest, notFound, serverError } from "@/lib/response";

type RouteContext = { params: Promise<{ id: string }> };

const VALID_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  PENDING: ["PENDING", "CONFIRMED", "CANCELLED"],
  CONFIRMED: ["CONFIRMED", "PROCESSING", "CANCELLED"],
  PROCESSING: ["PROCESSING", "SHIPPED", "CANCELLED"],
  SHIPPED: ["SHIPPED", "DELIVERED"],
  DELIVERED: ["DELIVERED"],
  CANCELLED: ["CANCELLED"],
};

export const GET = withAdminAuth(
  async (_req: AuthenticatedRequest, ctx: unknown) => {
    const { id } = await (ctx as RouteContext).params;
    try {
      await orderService.syncDeliveryProgression(id);

      const order = await prisma.order.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              createdAt: true,
            },
          },
          address: true,
          items: {
            select: {
              id: true,
              quantity: true,
              price: true,
              product: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  price: true,
                  stock: true,
                  imageUrl: true,
                  isActive: true,
                },
              },
            },
          },
          payment: {
            select: {
              id: true,
              amount: true,
              status: true,
              paymentMethod: true,
              provider: true,
              currency: true,
              providerOrderId: true,
              createdAt: true,
              updatedAt: true,
              attempts: {
                select: {
                  id: true,
                  status: true,
                  failureReason: true,
                  createdAt: true,
                },
                orderBy: { createdAt: "desc" },
              },
            },
          },
          feedback: true,
        },
      });

      if (!order) {
        return notFound("Order not found");
      }

      const enriched = {
        ...order,
        isRefill: order.id.startsWith("refill_"),
      };

      return ok(enriched);
    } catch (err) {
      console.error("[GET /api/admin/orders/[id]]", err);
      return serverError();
    }
  },
);

export const PATCH = withAdminAuth(
  async (req: AuthenticatedRequest, ctx: unknown) => {
    const { id } = await (ctx as RouteContext).params;
    const { data, error } = await validateBody(req, updateOrderStatusSchema);
    if (error) return error;

    try {
      const existing = await prisma.order.findUnique({
        where: { id },
        include: {
          user: { select: { id: true, name: true, email: true } },
          payment: true,
        },
      });

      if (!existing) {
        return notFound("Order not found");
      }

      if (existing.status === "DELIVERED" || existing.status === "CANCELLED") {
        return badRequest(
          `Cannot modify an order that is already ${existing.status}`,
        );
      }

      if (!VALID_TRANSITIONS[existing.status].includes(data.status)) {
        return badRequest(
          `Cannot change order status from ${existing.status} to ${data.status}`,
        );
      }

      const updated = await orderRepository.updateStatus(id, data.status);

      // H-07: settle COD payment when order reaches DELIVERED
      if (data.status === "DELIVERED") {
        await orderService.onOrderDelivered(id);
      }

      // Notify customer of order status change
      await notificationService
        .send({
          userId: existing.userId,
          type: "ORDER",
          title: `Order Status Updated: ${data.status}`,
          message: `Your order #${id.slice(-8)} has been updated to ${data.status.toLowerCase()}.`,
        })
        .catch((err) =>
          console.warn(
            "[PATCH /api/admin/orders/[id]] Notification dispatch warning:",
            err,
          ),
        );

      const enriched = {
        ...updated,
        isRefill: updated.id.startsWith("refill_"),
      };

      return ok(enriched, `Order status updated to ${data.status}`);
    } catch (err) {
      console.error("[PATCH /api/admin/orders/[id]]", err);
      return serverError();
    }
  },
);
