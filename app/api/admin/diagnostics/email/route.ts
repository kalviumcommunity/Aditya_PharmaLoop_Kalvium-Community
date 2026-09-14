import { verifyEmailTransport } from "@/lib/email";
import { withAdminAuth } from "@/lib/middleware";
import { ok, serverError } from "@/lib/response";

/**
 * Safe server-side email diagnostics endpoint.
 * Returns transport connectivity status and configured host/port/userMask
 * without EVER leaking passwords, OTPs, or auth secrets.
 */
export const GET = withAdminAuth(async () => {
  try {
    const diagnostics = await verifyEmailTransport();
    return ok(diagnostics, "Email transport diagnostics retrieved");
  } catch (err: unknown) {
    console.error("[GET /api/admin/diagnostics/email]", err);
    return serverError("Email diagnostics unavailable");
  }
});
