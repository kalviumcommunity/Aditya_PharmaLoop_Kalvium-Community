import { withAuth, AuthenticatedRequest } from "@/lib/middleware";
import { addressService } from "@/services/address.service";
import { validateBody } from "@/lib/validate";
import { addressSchema } from "@/types";
import { ok, created, serverError } from "@/lib/response";

export const GET = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const addresses = await addressService.getAddresses(req.auth.userId);
    return ok(addresses);
  } catch (err) {
    console.error("[GET /api/addresses]", err);
    return serverError();
  }
});

export const POST = withAuth(async (req: AuthenticatedRequest) => {
  const { data, error } = await validateBody(req, addressSchema);
  if (error) return error;

  try {
    const address = await addressService.addAddress(req.auth.userId, data);
    return created(address, "Address added successfully");
  } catch (err) {
    console.error("[POST /api/addresses]", err);
    return serverError();
  }
});
