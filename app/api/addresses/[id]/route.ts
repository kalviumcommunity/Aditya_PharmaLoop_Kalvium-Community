import { withAuth, AuthenticatedRequest } from "@/lib/middleware";
import { addressService } from "@/services/address.service";
import { validateBody } from "@/lib/validate";
import { addressSchema } from "@/types";
import { ok, notFound, forbidden, serverError } from "@/lib/response";

type RouteContext = { params: Promise<{ id: string }> };

export const PATCH = withAuth(
  async (req: AuthenticatedRequest, ctx: unknown) => {
    const { id } = await (ctx as RouteContext).params;
    const { data, error } = await validateBody(req, addressSchema.partial());
    if (error) return error;

    try {
      const updated = await addressService.updateAddress(req.auth.userId, id, data);
      return ok(updated, "Address updated");
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (err.message === "NOT_FOUND") return notFound("Address not found");
        if (err.message === "FORBIDDEN") return forbidden("Access denied");
      }
      console.error("[PATCH /api/addresses/[id]]", err);
      return serverError();
    }
  }
);

export const DELETE = withAuth(
  async (req: AuthenticatedRequest, ctx: unknown) => {
    const { id } = await (ctx as RouteContext).params;

    try {
      await addressService.deleteAddress(req.auth.userId, id);
      return ok(null, "Address deleted");
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (err.message === "NOT_FOUND") return notFound("Address not found");
        if (err.message === "FORBIDDEN") return forbidden("Access denied");
      }
      console.error("[DELETE /api/addresses/[id]]", err);
      return serverError();
    }
  }
);
