import { withAuth, AuthenticatedRequest } from "@/lib/middleware";
import { cartService } from "@/services/cart.service";
import { validateBody } from "@/lib/validate";
import { updateCartItemSchema } from "@/types";
import { ok, notFound, forbidden, serverError } from "@/lib/response";

type RouteContext = { params: Promise<{ itemId: string }> };

export const PATCH = withAuth(
  async (req: AuthenticatedRequest, ctx: unknown) => {
    const { itemId } = await (ctx as RouteContext).params;
    const { data, error } = await validateBody(req, updateCartItemSchema);
    if (error) return error;

    try {
      const item = await cartService.updateItem(req.auth.userId, itemId, data);
      return ok(item, "Cart item updated");
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (err.message === "ITEM_NOT_FOUND") return notFound("Cart item not found");
        if (err.message === "FORBIDDEN") return forbidden("Access denied");
      }
      console.error("[PATCH /api/cart/items/[itemId]]", err);
      return serverError();
    }
  }
);

export const DELETE = withAuth(
  async (req: AuthenticatedRequest, ctx: unknown) => {
    const { itemId } = await (ctx as RouteContext).params;

    try {
      await cartService.removeItem(req.auth.userId, itemId);
      return ok(null, "Cart item removed");
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (err.message === "ITEM_NOT_FOUND") return notFound("Cart item not found");
        if (err.message === "FORBIDDEN") return forbidden("Access denied");
      }
      console.error("[DELETE /api/cart/items/[itemId]]", err);
      return serverError();
    }
  }
);
