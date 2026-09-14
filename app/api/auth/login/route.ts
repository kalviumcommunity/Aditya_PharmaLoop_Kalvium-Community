import { NextRequest } from "next/server";
import { authService } from "@/services/auth.service";
import { validateBody } from "@/lib/validate";
import { loginSchema } from "@/types";
import { ok, unauthorized, serverError } from "@/lib/response";

export async function POST(req: NextRequest) {
  const { data, error } = await validateBody(req, loginSchema);
  if (error) return error;

  try {
    const { user, token } = await authService.login(data);
    const response = ok({ user, token }, "Login successful");

    response.headers.set(
      "Set-Cookie",
      `auth_token=${token}; HttpOnly; Path=/; Max-Age=${7 * 24 * 60 * 60};${process.env.NODE_ENV === "production" ? " Secure;" : ""} SameSite=Strict`
    );

    return response;
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "INVALID_CREDENTIALS") {
      return unauthorized("Invalid email or password");
    }
    if (err instanceof Error && err.message === "EMAIL_NOT_VERIFIED") {
      return unauthorized("Your email address is not verified. Please complete verification or register.");
    }
    console.error("[POST /api/auth/login]", err);
    return serverError();
  }
}
