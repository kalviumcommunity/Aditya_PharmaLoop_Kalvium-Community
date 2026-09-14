import nodemailer, { Transporter } from "nodemailer";

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
  service?: string;
}

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
}

// Module-level cached transporter
let cachedTransporter: Transporter | null = null;
let cachedConfigKey: string | null = null;

/**
 * Safely masks an email address for diagnostic logs (e.g., "ad***@gmail.com")
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes("@")) return "***@***";
  const [local, domain] = email.split("@");
  const maskedLocal =
    local.length <= 2
      ? `${local.charAt(0)}***`
      : `${local.slice(0, 2)}***${local.slice(-1)}`;
  return `${maskedLocal}@${domain}`;
}

/**
 * Resolves current SMTP configuration from environment variables.
 * Returns null if required credentials are not populated.
 */
export function getSmtpConfig(): SmtpConfig | null {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = (process.env.SMTP_PASSWORD || process.env.SMTP_PASS)?.trim();
  const portStr = process.env.SMTP_PORT?.trim();
  const service = process.env.SMTP_SERVICE?.trim();

  // If core credentials are not provided, return null
  if (!user || !pass || (!host && !service)) {
    return null;
  }

  const port = portStr ? parseInt(portStr, 10) : 587;
  const secureEnv = process.env.SMTP_SECURE?.trim().toLowerCase();
  const secure = secureEnv === "true" ? true : secureEnv === "false" ? false : port === 465;

  const from =
    process.env.SMTP_FROM?.trim() ||
    process.env.EMAIL_FROM?.trim() ||
    `PharmaLoop <${user}>`;

  return {
    host: host || "",
    port,
    secure,
    user,
    pass,
    from,
    service: service || undefined,
  };
}

/**
 * Returns a configured Nodemailer Transporter.
 * Throws a descriptive error if SMTP credentials are not configured.
 */
export function getEmailTransporter(): Transporter {
  const config = getSmtpConfig();

  if (!config) {
    const isProd = process.env.NODE_ENV === "production";
    const errorMsg = isProd
      ? "PRODUCTION_SMTP_UNCONFIGURED: SMTP_HOST, SMTP_USER, and SMTP_PASSWORD must be configured in production."
      : "SMTP_NOT_CONFIGURED: SMTP credentials (SMTP_HOST, SMTP_USER, SMTP_PASSWORD) are not set in environment. Real emails cannot be sent until configured.";

    console.error(`[EmailService] Configuration Error: ${errorMsg}`);
    throw new Error(errorMsg);
  }

  const configKey = `${config.service || config.host}:${config.port}:${config.secure}:${config.user}`;

  if (!cachedTransporter || cachedConfigKey !== configKey) {
    if (config.service) {
      cachedTransporter = nodemailer.createTransport({
        service: config.service,
        auth: {
          user: config.user,
          pass: config.pass,
        },
      });
    } else {
      cachedTransporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: {
          user: config.user,
          pass: config.pass,
        },
        connectionTimeout: 15000,
        greetingTimeout: 15000,
        socketTimeout: 20000,
      });
    }
    cachedConfigKey = configKey;
  }

  return cachedTransporter;
}

/**
 * Tests the mail transporter connection without leaking credentials.
 */
export async function verifyEmailTransport(): Promise<EmailDiagnosticsResult> {
  const config = getSmtpConfig();

  if (!config) {
    return {
      ok: false,
      configured: false,
      error: "SMTP credentials are missing from environment variables (SMTP_HOST, SMTP_USER, SMTP_PASSWORD).",
      code: "SMTP_NOT_CONFIGURED",
    };
  }

  try {
    const transporter = getEmailTransporter();
    await transporter.verify();

    return {
      ok: true,
      configured: true,
      host: config.host || config.service,
      port: config.port,
      secure: config.secure,
      userMasked: maskEmail(config.user),
      from: config.from,
    };
  } catch (err: unknown) {
    const errObj = err as { code?: string; message?: string; command?: string };
    const safeMsg = errObj.message || "Unknown SMTP verification error";
    const code = errObj.code || "SMTP_VERIFY_FAILED";

    console.error(
      `[EmailService] SMTP Connection Verification Failed: code=${code}, message=${safeMsg}`
    );

    return {
      ok: false,
      configured: true,
      host: config.host || config.service,
      port: config.port,
      secure: config.secure,
      userMasked: maskEmail(config.user),
      from: config.from,
      error: safeMsg,
      code,
    };
  }
}

/**
 * Builds the responsive HTML template for the 6-digit OTP verification email.
 */
function buildOtpEmailHtml(otp: string, name?: string): string {
  const greeting = name && name.trim() ? `Hi ${name.trim()},` : "Hello,";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify your PharmaLoop email</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f3f9f5; color: #1e293b;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f3f9f5; padding: 40px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 540px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 24px rgba(27, 94, 59, 0.08); border: 1px solid #e2e8f0;">
          <!-- Header -->
          <tr>
            <td style="padding: 36px 36px 20px 36px; text-align: left;">
              <table role="presentation" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="background-color: #1b5e3b; width: 40px; height: 40px; border-radius: 12px; text-align: center; vertical-align: middle;">
                    <span style="color: #ffffff; font-size: 20px; font-weight: bold; line-height: 40px;">🍃</span>
                  </td>
                  <td style="padding-left: 12px;">
                    <span style="font-size: 22px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px;">PharmaLoop</span>
                  </td>
                </tr>
              </table>

              <h1 style="font-size: 22px; font-weight: 800; color: #0f172a; margin: 24px 0 8px 0; letter-spacing: -0.4px;">
                Verify your email address
              </h1>
              <p style="font-size: 14px; color: #64748b; margin: 0 0 20px 0; line-height: 1.6;">
                ${greeting} welcome to PharmaLoop! Use the 6-digit verification code below to activate your account and access seamless medicine auto-refills:
              </p>

              <!-- OTP Callout Box -->
              <div style="background-color: #f1f8f4; border: 1px solid #cce8d7; border-radius: 16px; padding: 24px; text-align: center; margin: 24px 0;">
                <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #166534; margin-bottom: 8px;">
                  Your Verification Code
                </div>
                <div style="font-size: 36px; font-weight: 900; letter-spacing: 10px; color: #1b5e3b; font-family: 'Courier New', Courier, monospace; line-height: 1.2;">
                  ${otp}
                </div>
              </div>

              <!-- Security Information -->
              <table role="presentation" border="0" cellspacing="0" cellpadding="0" style="width: 100%; margin-top: 20px; background-color: #fffbeb; border-radius: 12px; padding: 14px 16px; border: 1px solid #fef3c7;">
                <tr>
                  <td style="vertical-align: top; width: 24px;">
                    <span style="font-size: 16px;">⏱️</span>
                  </td>
                  <td style="font-size: 13px; color: #92400e; line-height: 1.5; padding-left: 8px;">
                    <strong>This code expires in 10 minutes.</strong><br>
                    For your security, never share this code with anyone. PharmaLoop staff will never ask for your verification code.
                  </td>
                </tr>
              </table>

              <p style="font-size: 12px; color: #94a3b8; margin: 24px 0 0 0; line-height: 1.5; border-top: 1px solid #f1f5f9; padding-top: 16px;">
                If you did not sign up for a PharmaLoop account, please ignore this email. No action will be taken.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 36px; text-align: center; border-top: 1px solid #f1f5f9;">
              <p style="font-size: 11px; color: #94a3b8; margin: 0; line-height: 1.6;">
                &copy; ${new Date().getFullYear()} PharmaLoop Healthcare Pvt Ltd.<br>
                Reliable health. On schedule. Every time.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Builds the plain text fallback for the OTP email.
 */
function buildOtpEmailText(otp: string, name?: string): string {
  const greeting = name && name.trim() ? `Hi ${name.trim()},` : "Hello,";
  return `PharmaLoop\n\n${greeting} welcome to PharmaLoop!\n\nYour 6-digit email verification code is:\n\n${otp}\n\nThis code expires in 10 minutes.\nFor security reasons, do not share this code with anyone.\n\nIf you did not request this, you can safely ignore this email.\n\nPharmaLoop Healthcare`;
}

/**
 * Sends a real OTP verification email using the configured SMTP transporter.
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

  const config = getSmtpConfig();
  if (!config) {
    const errorMsg =
      "SMTP_NOT_CONFIGURED: SMTP credentials (SMTP_HOST, SMTP_USER, SMTP_PASSWORD) are not configured.";
    console.error(`[EmailService] Aborted dispatch to ${maskEmail(to)}: ${errorMsg}`);
    throw new Error(errorMsg);
  }

  const transporter = getEmailTransporter();
  const maskedTo = maskEmail(to);

  console.log(
    `[EmailService] Dispatching OTP verification email to ${maskedTo} via ${config.host || config.service}:${config.port}`
  );

  try {
    const info = await transporter.sendMail({
      from: config.from,
      to,
      subject: "Verify your email - PharmaLoop",
      text: buildOtpEmailText(otp, name),
      html: buildOtpEmailHtml(otp, name),
    });

    console.log(
      `[EmailService] Verification email successfully delivered to ${maskedTo} (messageId: ${info.messageId})`
    );

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (err: unknown) {
    const errObj = err as { code?: string; message?: string; command?: string };
    const safeErrorMsg = errObj.message || "Unknown error sending email";
    const code = errObj.code || "SEND_FAILED";

    console.error(
      `[EmailService] Failed to send verification email to ${maskedTo}: code=${code}, message=${safeErrorMsg}`
    );

    throw new Error(`SMTP_DELIVERY_FAILED:${code}:${safeErrorMsg}`);
  }
}

/**
 * Builds the responsive HTML template for the password reset OTP email.
 */
function buildPasswordResetOtpEmailHtml(otp: string, name?: string): string {
  const greeting = name && name.trim() ? `Hi ${name.trim()},` : "Hello,";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset your PharmaLoop password</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f3f9f5; color: #1e293b;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f3f9f5; padding: 40px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 540px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 24px rgba(27, 94, 59, 0.08); border: 1px solid #e2e8f0;">
          <!-- Header -->
          <tr>
            <td style="padding: 36px 36px 20px 36px; text-align: left;">
              <table role="presentation" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="background-color: #1b5e3b; width: 40px; height: 40px; border-radius: 12px; text-align: center; vertical-align: middle;">
                    <span style="color: #ffffff; font-size: 20px; font-weight: bold; line-height: 40px;">🍃</span>
                  </td>
                  <td style="padding-left: 12px;">
                    <span style="font-size: 22px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px;">PharmaLoop</span>
                  </td>
                </tr>
              </table>

              <h1 style="font-size: 22px; font-weight: 800; color: #0f172a; margin: 24px 0 8px 0; letter-spacing: -0.4px;">
                Reset your PharmaLoop password
              </h1>
              <p style="font-size: 14px; color: #64748b; margin: 0 0 20px 0; line-height: 1.6;">
                ${greeting} we received a request to reset your password. Use the 6-digit verification code below to authorize your password change:
              </p>

              <!-- OTP Callout Box -->
              <div style="background-color: #f1f8f4; border: 1px solid #cce8d7; border-radius: 16px; padding: 24px; text-align: center; margin: 24px 0;">
                <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #166534; margin-bottom: 8px;">
                  Password Reset Code
                </div>
                <div style="font-size: 36px; font-weight: 900; letter-spacing: 10px; color: #1b5e3b; font-family: 'Courier New', Courier, monospace; line-height: 1.2;">
                  ${otp}
                </div>
              </div>

              <!-- Security Information -->
              <table role="presentation" border="0" cellspacing="0" cellpadding="0" style="width: 100%; margin-top: 20px; background-color: #fffbeb; border-radius: 12px; padding: 14px 16px; border: 1px solid #fef3c7;">
                <tr>
                  <td style="vertical-align: top; width: 24px;">
                    <span style="font-size: 16px;">⏱️</span>
                  </td>
                  <td style="font-size: 13px; color: #92400e; line-height: 1.5; padding-left: 8px;">
                    <strong>This code expires in 10 minutes.</strong><br>
                    For your security, never share this code with anyone. PharmaLoop staff will never ask for your verification code. If you did not request a password reset, please ignore this email or contact support.
                  </td>
                </tr>
              </table>

              <p style="font-size: 12px; color: #94a3b8; margin: 24px 0 0 0; line-height: 1.5; border-top: 1px solid #f1f5f9; padding-top: 16px;">
                If you did not request this password reset, please ignore this email. Your existing password remains completely secure.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 36px; text-align: center; border-top: 1px solid #f1f5f9;">
              <p style="font-size: 11px; color: #94a3b8; margin: 0; line-height: 1.6;">
                &copy; ${new Date().getFullYear()} PharmaLoop Healthcare Pvt Ltd.<br>
                Reliable health. On schedule. Every time.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Builds the plain text fallback for the password reset OTP email.
 */
function buildPasswordResetOtpEmailText(otp: string, name?: string): string {
  const greeting = name && name.trim() ? `Hi ${name.trim()},` : "Hello,";
  return `PharmaLoop\n\n${greeting} we received a request to reset your password.\n\nYour 6-digit password reset code is:\n\n${otp}\n\nThis code expires in 10 minutes.\nFor your security, never share this code with anyone.\nIf you did not request a password reset, please ignore this email or contact support.\n\nPharmaLoop Healthcare`;
}

/**
 * Sends a real password reset OTP email using the configured SMTP transporter.
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

  const config = getSmtpConfig();
  if (!config) {
    const errorMsg =
      "SMTP_NOT_CONFIGURED: SMTP credentials (SMTP_HOST, SMTP_USER, SMTP_PASSWORD) are not configured.";
    console.error(`[EmailService] Aborted dispatch to ${maskEmail(to)}: ${errorMsg}`);
    throw new Error(errorMsg);
  }

  const transporter = getEmailTransporter();
  const maskedTo = maskEmail(to);

  console.log(
    `[EmailService] Dispatching Password Reset OTP email to ${maskedTo} via ${config.host || config.service}:${config.port}`
  );

  try {
    const info = await transporter.sendMail({
      from: config.from,
      to,
      subject: "Reset your PharmaLoop password",
      text: buildPasswordResetOtpEmailText(otp, name),
      html: buildPasswordResetOtpEmailHtml(otp, name),
    });

    console.log(
      `[EmailService] Password reset email successfully delivered to ${maskedTo} (messageId: ${info.messageId})`
    );

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (err: unknown) {
    const errObj = err as { code?: string; message?: string; command?: string };
    const safeErrorMsg = errObj.message || "Unknown error sending email";
    const code = errObj.code || "SEND_FAILED";

    console.error(
      `[EmailService] Failed to send password reset email to ${maskedTo}: code=${code}, message=${safeErrorMsg}`
    );

    throw new Error(`SMTP_DELIVERY_FAILED:${code}:${safeErrorMsg}`);
  }
}
