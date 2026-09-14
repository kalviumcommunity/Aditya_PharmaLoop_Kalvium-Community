import { NextRequest, NextResponse } from "next/server";
import { verifyPasswordResetOtpSchema } from "@/types";
import { passwordResetService } from "@/services/password-reset.service";
import { validateBody } from "@/lib/validate";

export async function POST(request: NextRequest) {
  const { data, error } = await validateBody(request, verifyPasswordResetOtpSchema);
  if (error) return error;

  try {
    const { email, otp } = data;
    const result = await passwordResetService.verifyResetOtp(email, otp);

    return NextResponse.json(
      {
        success: true,
        data: {
          resetToken: result.resetToken,
        },
        message: result.message,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";

    if (message.startsWith("INVALID_OTP:")) {
      const remaining = message.split(":")[1];
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_OTP",
          message: `Incorrect verification code. ${remaining} attempt(s) remaining.`,
          remainingAttempts: parseInt(remaining, 10),
        },
        { status: 400 }
      );
    }

    if (message === "MAX_ATTEMPTS_EXCEEDED") {
      return NextResponse.json(
        {
          success: false,
          error: "MAX_ATTEMPTS_EXCEEDED",
          message: "Too many failed attempts. This code has been locked. Please request a new code.",
        },
        { status: 403 }
      );
    }

    if (message === "OTP_EXPIRED") {
      return NextResponse.json(
        {
          success: false,
          error: "OTP_EXPIRED",
          message: "Verification code has expired. Please request a new code.",
        },
        { status: 400 }
      );
    }

    if (message === "INVALID_OR_CONSUMED_OTP") {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_OR_CONSUMED_OTP",
          message: "Invalid or already used verification code. Please request a new one.",
        },
        { status: 400 }
      );
    }

    console.error("[VerifyResetOtp] Error:", message);
    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_ERROR",
        message: "Failed to verify code. Please try again.",
      },
      { status: 500 }
    );
  }
}
