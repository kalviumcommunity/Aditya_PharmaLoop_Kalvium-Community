import { NextRequest, NextResponse } from "next/server";
import { resetPasswordSchema } from "@/types";
import { passwordResetService } from "@/services/password-reset.service";
import { validateBody } from "@/lib/validate";

export async function POST(request: NextRequest) {
  const { data, error } = await validateBody(request, resetPasswordSchema);
  if (error) return error;

  try {
    const { resetToken, newPassword } = data;
    const result = await passwordResetService.resetPassword(resetToken, newPassword);

    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";

    if (message === "INVALID_OR_EXPIRED_RESET_TOKEN") {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_OR_EXPIRED_RESET_TOKEN",
          message: "Reset authorization has expired or is invalid. Please restart the password recovery process.",
        },
        { status: 400 }
      );
    }

    if (message === "USER_NOT_FOUND") {
      return NextResponse.json(
        {
          success: false,
          error: "USER_NOT_FOUND",
          message: "User account could not be found.",
        },
        { status: 404 }
      );
    }

    console.error("[ResetPassword] Error:", message);
    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_ERROR",
        message: "Failed to update password. Please try again.",
      },
      { status: 500 }
    );
  }
}
