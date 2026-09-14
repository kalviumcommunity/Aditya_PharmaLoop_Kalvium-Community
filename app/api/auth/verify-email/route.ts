import { NextRequest } from "next/server";
import { verificationService } from "@/services/verification.service";
import { validateBody } from "@/lib/validate";
import { verifyEmailSchema } from "@/types";
import { ok, badRequest, conflict, serverError } from "@/lib/response";

export async function POST(req: NextRequest) {
  const { data, error } = await validateBody(req, verifyEmailSchema);
  if (error) return error;

  try {
    const { user, token } = await verificationService.verifyAndCreateUser(data.email, data.otp);

    // Return safe user information (NO token in JSON response)
    const response = ok(
      {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          emailVerifiedAt: user.emailVerifiedAt,
        },
      },
      "Email verified and account registered successfully"
    );

    // Set HttpOnly auth_token cookie
    response.headers.set(
      "Set-Cookie",
      `auth_token=${token}; HttpOnly; Path=/; Max-Age=${7 * 24 * 60 * 60}; SameSite=Strict`
    );

    return response;
  } catch (err: unknown) {
    if (err instanceof Error) {
      if (err.message === "INVALID_OR_CONSUMED_OTP") {
        return badRequest("No active verification code found for this email. Please request a new one.");
      }
      if (err.message === "OTP_EXPIRED") {
        return badRequest("Verification code has expired. Please request a new code.");
      }
      if (err.message === "MAX_ATTEMPTS_EXCEEDED") {
        return badRequest("Maximum verification attempts exceeded. Please request a new code.");
      }
      if (err.message.startsWith("INVALID_OTP:")) {
        const remaining = err.message.split(":")[1];
        return badRequest(`Invalid verification code. ${remaining} attempt(s) remaining.`);
      }
      if (err.message === "EMAIL_ALREADY_REGISTERED") {
        return conflict("An account with this email is already registered.");
      }
      if (err.message === "PHONE_ALREADY_REGISTERED") {
        return conflict("An account with this phone number already exists.");
      }
    }
    console.error("[POST /api/auth/verify-email]", err);
    return serverError();
  }
}
