import { withAuth, AuthenticatedRequest } from "@/lib/middleware";
import { authService } from "@/services/auth.service";
import { ok, notFound, serverError } from "@/lib/response";

export const GET = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const user = await authService.getMe(req.auth.userId);
    return ok(user);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "USER_NOT_FOUND") {
      return notFound("User not found");
    }
    console.error("[GET /api/auth/me]", err);
    return serverError();
  }
});
