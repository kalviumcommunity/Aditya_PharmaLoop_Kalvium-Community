import { NextRequest, NextResponse } from "next/server";
import { forgotPasswordSchema } from "@/types";
import { passwordResetService } from "@/services/password-reset.service";
import { validateBody } from "@/lib/validate";

export async function POST(request: NextRequest) {
  const { data, error } = await validateBody(request, forgotPasswordSchema);
  if (error) return error;

  try {
    const result = await passwordResetService.initiatePasswordReset(data.email);
    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";

    if (message.startsWith("RESEND_COOLDOWN:")) {
      const remaining = message.split(":")[1];
      return NextResponse.json(
        {
          success: false,
          error: "RESEND_COOLDOWN",
          message: `Please wait ${remaining} seconds before requesting another code.`,
          remainingSeconds: parseInt(remaining, 10),
        },
        { status: 429 }
      );
    }

    console.error("[ForgotPassword] Error initiating reset:", message);
    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_ERROR",
        message: "Failed to process password reset request. Please try again.",
      },
      { status: 500 }
    );
  }
}
