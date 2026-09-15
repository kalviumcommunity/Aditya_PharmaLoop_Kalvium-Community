import {
  maskEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  verifyBrevoApi,
  getSender,
  getBrevoClient,
} from "@/services/emailService";

export interface SendOtpEmailParams {
  to: string;
  otp: string;
  name?: string;
}

export interface EmailDiagnosticsResult {
  ok: boolean;
  configured: boolean;
  host?: string;
  port?: number;
  secure?: boolean;
  userMasked?: string;
  from?: string;
  error?: string;
  code?: string;
  plan?: string;
}

export { maskEmail };

/**
 * Backward-compatible diagnostics function testing Brevo HTTPS API connection.
 */
export async function verifyEmailTransport(): Promise<EmailDiagnosticsResult> {
  const brevoRes = await verifyBrevoApi();
  return {
    ok: brevoRes.ok,
    configured: brevoRes.configured,
    host: "api.brevo.com (HTTPS)",
    port: 443,
    secure: true,
    userMasked: brevoRes.accountEmailMasked || maskEmail(brevoRes.senderEmail),
    from: `${brevoRes.senderName} <${brevoRes.senderEmail}>`,
    plan: brevoRes.plan,
    error: brevoRes.error,
    code: brevoRes.code,
  };
}

/**
 * Sends a real OTP verification email using Brevo's HTTPS API.
 * Supports both object parameter ({ to, otp, name }) and positional parameters (email, otp, name).
 */
export async function sendVerificationOtpEmail(
  paramsOrEmail: SendOtpEmailParams | string,
  otpArg?: string,
  nameArg?: string
): Promise<{ success: boolean; messageId?: string }> {
  let to: string;
  let otp: string;
  let name: string | undefined;

  if (typeof paramsOrEmail === "object") {
    to = paramsOrEmail.to.trim().toLowerCase();
    otp = paramsOrEmail.otp.trim();
    name = paramsOrEmail.name?.trim();
  } else {
    to = paramsOrEmail.trim().toLowerCase();
    otp = (otpArg || "").trim();
    name = nameArg?.trim();
  }

  if (!to || !otp) {
    throw new Error("INVALID_EMAIL_PARAMS: Recipient email and OTP are required.");
  }

  return sendVerificationEmail({ to, otp, name });
}

/**
 * Sends a real password reset OTP email using Brevo's HTTPS API.
 * Supports both object parameter ({ to, otp, name }) and positional parameters (email, otp, name).
 */
export async function sendPasswordResetOtpEmail(
  paramsOrEmail: SendOtpEmailParams | string,
  otpArg?: string,
  nameArg?: string
): Promise<{ success: boolean; messageId?: string }> {
  let to: string;
  let otp: string;
  let name: string | undefined;

  if (typeof paramsOrEmail === "object") {
    to = paramsOrEmail.to.trim().toLowerCase();
    otp = paramsOrEmail.otp.trim();
    name = paramsOrEmail.name?.trim();
  } else {
    to = paramsOrEmail.trim().toLowerCase();
    otp = (otpArg || "").trim();
    name = nameArg?.trim();
  }

  if (!to || !otp) {
    throw new Error("INVALID_EMAIL_PARAMS: Recipient email and OTP are required.");
  }

  return sendPasswordResetEmail({ to, otp, name });
}

export { getSender, getBrevoClient };
