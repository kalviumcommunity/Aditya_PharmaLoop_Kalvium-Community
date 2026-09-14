import { NextRequest } from "next/server";
import { authService } from "@/services/auth.service";
import { validateBody } from "@/lib/validate";
import { loginSchema } from "@/types";
import { ok, unauthorized, serverError } from "@/lib/response";
import { loginRateLimiter } from "@/lib/auth-rate-limit";

export async function POST(req: NextRequest) {
  const { data, error } = await validateBody(req, loginSchema);
  if (error) return error;

  const clientIp =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "127.0.0.1";

  // Check brute-force lockout status
  const rateLimitStatus = loginRateLimiter.check(clientIp, data.email);
  if (!rateLimitStatus.allowed) {
    const minutes = Math.ceil(rateLimitStatus.retryAfterSeconds / 60);
    return new Response(
      JSON.stringify({
        success: false,
        error: `Too many failed login attempts. Please try again in ${minutes} minute${minutes > 1 ? "s" : ""}.`,
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": rateLimitStatus.retryAfterSeconds.toString(),
        },
      }
    );
  }

  try {
    const { user, token } = await authService.login(data);

    // Record success to clear failure counter
    loginRateLimiter.onSuccessfulLogin(clientIp, data.email);

    const response = ok({ user, token }, "Login successful");

    response.headers.set(
      "Set-Cookie",
      `auth_token=${token}; HttpOnly; Path=/; Max-Age=${7 * 24 * 60 * 60};${process.env.NODE_ENV === "production" ? " Secure;" : ""} SameSite=Lax`,
    );

    return response;
  } catch (err: unknown) {
    // Record failed attempt
    loginRateLimiter.onFailedAttempt(clientIp, data.email);

    if (err instanceof Error && err.message === "INVALID_CREDENTIALS") {
      return unauthorized("Invalid email or password");
    }
    if (err instanceof Error && err.message === "GOOGLE_ACCOUNT_NO_PASSWORD") {
      return unauthorized(
        "This account was created with Google. Please click 'Continue with Google' to sign in."
      );
    }
    if (err instanceof Error && err.message === "EMAIL_NOT_VERIFIED") {
      return unauthorized(
        "Your email address is not verified. Please complete verification or register.",
      );
    }
    console.error("[POST /api/auth/login]", err);
    return serverError();
  }
}
