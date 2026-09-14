import { withAuth, AuthenticatedRequest } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { validateBody } from "@/lib/validate";
import { submitFeedbackSchema } from "@/types";
import {
  created,
  badRequest,
  forbidden,
  notFound,
  conflict,
  serverError,
} from "@/lib/response";
import { Prisma } from "@/app/generated/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export const POST = withAuth(
  async (req: AuthenticatedRequest, ctx: unknown) => {
    const { id: orderId } = await (ctx as RouteContext).params;
    const { data, error } = await validateBody(req, submitFeedbackSchema);
    if (error) return error;

    try {
      // 1. Verify order exists and belongs to the authenticated user
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: {
          id: true,
          userId: true,
          status: true,
          feedback: { select: { id: true } },
        },
      });

      if (!order) {
        return notFound("Order not found");
      }

      if (order.userId !== req.auth.userId) {
        return forbidden("You can only submit feedback for your own orders");
      }

      // 2. Feedback can only be submitted for DELIVERED orders
      if (order.status !== "DELIVERED") {
        return badRequest(
          `Feedback can only be submitted for delivered orders (current status: ${order.status})`,
        );
      }

      // 3. Application-level check for duplicate feedback
      if (order.feedback) {
        return conflict("Feedback has already been submitted for this order");
      }

      // 4. Create feedback (guarded by database-level UNIQUE constraint on orderId)
      const feedback = await prisma.orderFeedback.create({
        data: {
          orderId,
          userId: req.auth.userId,
          rating: data.rating,
          comment: data.comment?.trim() || null,
        },
      });

      return created(feedback, "Thank you for your feedback!");
    } catch (err: unknown) {
      // Handle race-condition DB unique constraint violation
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        return conflict("Feedback has already been submitted for this order");
      }
      console.error("[POST /api/orders/[id]/feedback]", err);
      return serverError();
    }
  },
);
