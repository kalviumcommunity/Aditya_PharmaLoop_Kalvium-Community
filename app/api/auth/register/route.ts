import { NextRequest } from "next/server";
import { verificationService } from "@/services/verification.service";
import { validateBody } from "@/lib/validate";
import { registerSchema } from "@/types";
import { ok, conflict, badRequest, serverError } from "@/lib/response";

export async function POST(req: NextRequest) {
  const { data, error } = await validateBody(req, registerSchema);
  if (error) return error;

  try {
    const result = await verificationService.initiateRegistration(data);
    return ok(
      {
        requiresVerification: true,
        email: result.email,
      },
      "Verification code sent to your email. Please verify to activate your account."
    );
  } catch (err: unknown) {
    if (err instanceof Error) {
      if (err.message === "EMAIL_ALREADY_REGISTERED") {
        return conflict("An account with this email already exists.");
      }
      if (err.message === "PHONE_ALREADY_REGISTERED") {
        return conflict("An account with this phone number already exists.");
      }
      if (err.message.startsWith("RESEND_COOLDOWN:")) {
        const seconds = err.message.split(":")[1];
        return Response.json(
          {
            success: false,
            error: `Please wait ${seconds} seconds before requesting a new verification code.`,
            retryAfter: parseInt(seconds, 10),
          },
          { status: 429 }
        );
      }
      if (
        err.message.includes("BREVO_NOT_CONFIGURED") ||
        err.message.includes("SMTP_NOT_CONFIGURED") ||
        err.message.includes("PRODUCTION_SMTP_UNCONFIGURED")
      ) {
        console.error("[POST /api/auth/register] Email service unconfigured:", err.message);
        return badRequest(
          "Email delivery service is not configured. Please set BREVO_API_KEY in environment variables to receive verification emails."
        );
      }
      if (
        err.message.includes("BREVO_DELIVERY_FAILED") ||
        err.message.includes("SMTP_DELIVERY_FAILED") ||
        err.message.includes("ECONNREFUSED") ||
        err.message.includes("ESOCKET") ||
        err.message.includes("ETIMEDOUT") ||
        err.message.includes("ENOTFOUND")
      ) {
        console.error("[POST /api/auth/register] Email delivery error:", err.message);
        return badRequest(
          "Failed to deliver verification email. Please check your Brevo API configuration and internet connection."
        );
      }
    }
    console.error("[POST /api/auth/register]", err);
    return serverError();
  }
}
