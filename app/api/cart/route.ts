import { withAuth, AuthenticatedRequest } from "@/lib/middleware";
import { cartService } from "@/services/cart.service";
import { ok, serverError } from "@/lib/response";

export const GET = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const cart = await cartService.getCart(req.auth.userId);
    return ok(cart);
  } catch (err) {
    console.error("[GET /api/cart]", err);
    return serverError();
  }
});
