import { withAuth, AuthenticatedRequest } from "@/lib/middleware";
import { orderService } from "@/services/order.service";
import { validateBody } from "@/lib/validate";
import { createOrderSchema } from "@/types";
import { ok, created, badRequest, serverError } from "@/lib/response";

export const GET = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const orders = await orderService.getOrders(req.auth.userId);
    return ok(orders);
  } catch (err) {
    console.error("[GET /api/orders]", err);
    return serverError();
  }
});

export const POST = withAuth(async (req: AuthenticatedRequest) => {
  const { data, error } = await validateBody(req, createOrderSchema);
  if (error) return error;

  try {
    const order = await orderService.createOneTimeOrder(req.auth.userId, data);
    return created(order, "Order created successfully");
  } catch (err: unknown) {
    if (err instanceof Error) {
      if (err.message === "CART_EMPTY") {
        return badRequest("Cannot create order from an empty cart");
      }
      if (err.message === "INVALID_ADDRESS") {
        return badRequest("Invalid or unauthorized delivery address");
      }
      if (err.message === "INACTIVE_PRODUCTS_IN_CART") {
        return badRequest("Cart contains inactive or unavailable products");
      }
    }
    console.error("[POST /api/orders]", err);
    return serverError();
  }
});
