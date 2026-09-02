import { withAuth, AuthenticatedRequest } from "@/lib/middleware";
import { cartService } from "@/services/cart.service";
import { validateBody } from "@/lib/validate";
import { addCartItemSchema } from "@/types";
import { created, notFound, serverError } from "@/lib/response";

export const POST = withAuth(async (req: AuthenticatedRequest) => {
  const { data, error } = await validateBody(req, addCartItemSchema);
  if (error) return error;

  try {
    const item = await cartService.addItem(req.auth.userId, data);
    return created(item, "Item added to cart");
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "PRODUCT_NOT_FOUND") {
      return notFound("Product not found");
    }
    console.error("[POST /api/cart/items]", err);
    return serverError();
  }
});
