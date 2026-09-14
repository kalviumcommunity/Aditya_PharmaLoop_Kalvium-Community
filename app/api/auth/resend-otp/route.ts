import { NextRequest } from "next/server";
import { verificationService } from "@/services/verification.service";
import { validateBody } from "@/lib/validate";
import { resendOtpSchema } from "@/types";
import { ok, badRequest, conflict, serverError } from "@/lib/response";

export async function POST(req: NextRequest) {
  const { data, error } = await validateBody(req, resendOtpSchema);
  if (error) return error;

  try {
    const result = await verificationService.resendOtp(data.email);
    return ok(result, "A new verification code has been sent to your email.");
  } catch (err: unknown) {
    if (err instanceof Error) {
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
      if (err.message === "EMAIL_ALREADY_REGISTERED") {
        return conflict("This email is already registered and verified.");
      }
      if (err.message === "NO_PENDING_REGISTRATION") {
        return badRequest("No pending registration found for this email. Please sign up first.");
      }
      if (err.message.includes("SMTP_NOT_CONFIGURED") || err.message.includes("PRODUCTION_SMTP_UNCONFIGURED")) {
        console.error("[POST /api/auth/resend-otp] SMTP unconfigured:", err.message);
        return badRequest(
          "Email delivery service is not configured. Please set SMTP credentials in .env to receive verification emails."
        );
      }
      if (err.message.includes("EAUTH")) {
        console.error("[POST /api/auth/resend-otp] SMTP Authentication Failure");
        return badRequest(
          "Email delivery failed: SMTP authentication rejected. Please check your SMTP credentials."
        );
      }
      if (
        err.message.includes("SMTP_DELIVERY_FAILED") ||
        err.message.includes("ECONNREFUSED") ||
        err.message.includes("ESOCKET") ||
        err.message.includes("ETIMEDOUT") ||
        err.message.includes("ENOTFOUND")
      ) {
        console.error("[POST /api/auth/resend-otp] SMTP Connection/Send Error:", err.message);
        return badRequest("Failed to send verification email. Please verify your email configuration.");
      }
    }
    console.error("[POST /api/auth/resend-otp]", err);
    return serverError();
  }
}
