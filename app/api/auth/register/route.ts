import { NextRequest } from "next/server";
import { authService } from "@/services/auth.service";
import { validateBody } from "@/lib/validate";
import { registerSchema } from "@/types";
import { created, conflict, serverError } from "@/lib/response";

export async function POST(req: NextRequest) {
  const { data, error } = await validateBody(req, registerSchema);
  if (error) return error;

  try {
    const { user, token } = await authService.register(data);
    const response = created({ user, token }, "Account created successfully");

    // Set auth cookie for browser clients
    response.headers.set(
      "Set-Cookie",
      `auth_token=${token}; HttpOnly; Path=/; Max-Age=${7 * 24 * 60 * 60}; SameSite=Strict`
    );

    return response;
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "EMAIL_TAKEN") {
      return conflict("An account with this email already exists");
    }
    console.error("[POST /api/auth/register]", err);
    return serverError();
  }
}
