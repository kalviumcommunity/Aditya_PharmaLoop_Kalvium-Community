import { BrevoClient } from "@getbrevo/brevo";

// ============================================================================
// Brevo Verified Sender Configuration
// NOTE: This must match a verified sender email in your Brevo account dashboard.
// (Brevo Dashboard -> Senders, Domains & Dedicated IPs -> Senders)
// If you verify a different email in Brevo, you can update this single line:
// ============================================================================
export const DEFAULT_SENDER = {
  name: "PharmaLoop",
  email: "adityabh9the@gmail.com", // <-- UPDATE HERE if your verified Brevo sender changes
};

/**
 * Resolves the sender email and name.
 * Uses SMTP_FROM or EMAIL_FROM if set in the environment, otherwise falls back
 * to DEFAULT_SENDER. Never requires a new required environment variable.
 */
export function getSender(): { name: string; email: string } {
  const envFrom = process.env.SMTP_FROM?.trim() || process.env.EMAIL_FROM?.trim();
  if (envFrom) {
    const match = envFrom.match(/^(?:(?:"?([^"<]+)"?\s*)?<)?([^>]+)>?$/);
    if (match) {
      const parsedName = match[1]?.trim();
      const parsedEmail = match[2]?.trim();
      if (parsedEmail && parsedEmail.includes("@")) {
        return {
          name: parsedName || DEFAULT_SENDER.name,
          email: parsedEmail,
        };
      }
    }
  }
  return DEFAULT_SENDER;
}

// Module-level cached client instance
let brevoClientInstance: BrevoClient | null = null;
let cachedApiKey: string | null = null;

/**
 * Returns a configured BrevoClient instance or null if BREVO_API_KEY is unset.
 */
export function getBrevoClient(): BrevoClient | null {
  const apiKey = process.env.BREVO_API_KEY?.trim();
  if (!apiKey) {
    return null;
  }
  if (!brevoClientInstance || cachedApiKey !== apiKey) {
    brevoClientInstance = new BrevoClient({ apiKey });
    cachedApiKey = apiKey;
  }
  return brevoClientInstance;
}

/**
 * Safely masks an email address for diagnostic logs (e.g., "ad***e@gmail.com")
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
 * Sanitizes input strings for safe inclusion inside HTML templates.
 */
export function escapeHtml(str: unknown): string {
  if (str === null || str === undefined) return "";
  const s = String(str);
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export interface BrevoDiagnosticsResult {
  ok: boolean;
  configured: boolean;
  senderEmail: string;
  senderName: string;
  accountEmailMasked?: string;
  plan?: string;
  error?: string;
  code?: string;
}

/**
 * Tests the Brevo API connection via HTTPS without sending any real emails.
 * Calls the Brevo Account endpoint to verify API key validity and connectivity.
 */
export async function verifyBrevoApi(): Promise<BrevoDiagnosticsResult> {
  const sender = getSender();
  const apiKey = process.env.BREVO_API_KEY?.trim();

  if (!apiKey) {
    return {
      ok: false,
      configured: false,
      senderEmail: sender.email,
      senderName: sender.name,
      error: "BREVO_API_KEY is not configured in environment variables.",
      code: "BREVO_NOT_CONFIGURED",
    };
  }

  try {
    const client = getBrevoClient();
    if (!client) {
      throw new Error("BREVO_CLIENT_INIT_FAILED");
    }

    const account = await client.account.getAccount();
    const accountEmail = account?.email ? maskEmail(account.email) : undefined;
    const plan = account?.plan?.[0]?.type || "Standard";

    return {
      ok: true,
      configured: true,
      senderEmail: sender.email,
      senderName: sender.name,
      accountEmailMasked: accountEmail,
      plan,
    };
  } catch (err: unknown) {
    const errObj = err as { statusCode?: number; message?: string; body?: unknown };
    const safeMsg = errObj.message || "Unknown error connecting to Brevo API";
    const code = errObj.statusCode ? `BREVO_HTTP_${errObj.statusCode}` : "BREVO_CONNECTION_ERROR";

    console.error(`[EmailService] Brevo API Verification Failed: code=${code}, message=${safeMsg}`);

    return {
      ok: false,
      configured: true,
      senderEmail: sender.email,
      senderName: sender.name,
      error: safeMsg,
      code,
    };
  }
}

/**
 * Base responsive HTML email wrapper with PharmaLoop branding.
 */
function wrapInBaseTemplate(options: {
  preheader: string;
  title: string;
  greeting?: string;
  contentHtml: string;
}): string {
  const year = new Date().getFullYear();
  const greetingHtml = options.greeting
    ? `<p style="font-size: 15px; color: #475569; margin: 0 0 16px 0; line-height: 1.6;">${escapeHtml(options.greeting)}</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <title>${escapeHtml(options.title)}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f3f9f5; color: #1e293b;">
  <!-- Hidden preheader for email clients -->
  <div style="display: none; font-size: 1px; color: #f3f9f5; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
    ${escapeHtml(options.preheader)}
  </div>

  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f3f9f5; padding: 36px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 560px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 24px rgba(27, 94, 59, 0.08); border: 1px solid #e2e8f0;">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 36px 20px 36px; text-align: left; border-bottom: 1px solid #f1f5f9;">
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
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px 36px;">
              <h1 style="font-size: 22px; font-weight: 800; color: #0f172a; margin: 0 0 16px 0; letter-spacing: -0.4px;">
                ${escapeHtml(options.title)}
              </h1>
              ${greetingHtml}
              ${options.contentHtml}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px 36px; text-align: center; border-top: 1px solid #f1f5f9;">
              <p style="font-size: 11px; color: #94a3b8; margin: 0 0 8px 0; line-height: 1.6;">
                &copy; ${year} PharmaLoop Healthcare Pvt Ltd.<br>
                Reliable health. On schedule. Every time.
              </p>
              <p style="font-size: 11px; color: #cbd5e1; margin: 0; line-height: 1.4;">
                This is an automated transactional notification sent via PharmaLoop.
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
 * Core dispatch function sending an email via Brevo's HTTPS API.
 */
async function sendBrevoEmail(params: {
  to: string;
  name?: string;
  subject: string;
  htmlContent: string;
  textContent: string;
  emailType: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const { to, name, subject, htmlContent, textContent, emailType } = params;
  const maskedTo = maskEmail(to);
  const client = getBrevoClient();
  const sender = getSender();

  if (!client) {
    const errorMsg = `BREVO_NOT_CONFIGURED: BREVO_API_KEY environment variable is not set.`;
    console.warn(`[EmailService] Skipped ${emailType} email to ${maskedTo}: ${errorMsg}`);
    return { success: false, error: errorMsg };
  }

  try {
    console.log(`[EmailService] Dispatching ${emailType} email to ${maskedTo} via Brevo HTTPS API`);

    const response = await client.transactionalEmails.sendTransacEmail({
      sender: {
        name: sender.name,
        email: sender.email,
      },
      to: [
        {
          email: to.trim().toLowerCase(),
          name: name?.trim() || undefined,
        },
      ],
      subject,
      htmlContent,
      textContent,
    });

    const messageId = response?.messageId;
    console.log(`[EmailService] ${emailType} email successfully sent to ${maskedTo} (messageId: ${messageId || "ok"})`);

    return {
      success: true,
      messageId,
    };
  } catch (err: unknown) {
    const errObj = err as { statusCode?: number; message?: string; body?: unknown };
    const safeErrorMsg = errObj.message || "Unknown error sending email via Brevo API";
    const statusCode = errObj.statusCode ? ` (status ${errObj.statusCode})` : "";

    console.error(
      `[EmailService] Failed to send ${emailType} email to ${maskedTo}${statusCode}: ${safeErrorMsg}`
    );

    return {
      success: false,
      error: `BREVO_DELIVERY_FAILED: ${safeErrorMsg}`,
    };
  }
}

// ============================================================================
// Flow-Specific Email Functions
// ============================================================================

export interface SendVerificationEmailParams {
  to: string;
  otp: string;
  name?: string;
}

/**
 * 1. Send OTP Email for registration or email verification.
 * Note: Throws on failure or missing config so the authentication flow can return
 * an actionable message to the client (matching existing behavior).
 */
export async function sendVerificationEmail(
  params: SendVerificationEmailParams
): Promise<{ success: boolean; messageId?: string }> {
  const { to, otp, name } = params;
  if (!to || !otp) {
    throw new Error("INVALID_EMAIL_PARAMS: Recipient email and OTP are required.");
  }

  const client = getBrevoClient();
  if (!client) {
    const errorMsg = "BREVO_NOT_CONFIGURED: BREVO_API_KEY is not configured in environment variables.";
    console.error(`[EmailService] Aborted OTP dispatch to ${maskEmail(to)}: ${errorMsg}`);
    throw new Error(errorMsg);
  }

  const greeting = name?.trim() ? `Hi ${name.trim()},` : "Hello,";

  const contentHtml = `
    <p style="font-size: 14px; color: #64748b; margin: 0 0 20px 0; line-height: 1.6;">
      Welcome to PharmaLoop! Use the 6-digit verification code below to activate your account and access seamless medicine auto-refills:
    </p>

    <!-- OTP Callout Box -->
    <div style="background-color: #f1f8f4; border: 1px solid #cce8d7; border-radius: 16px; padding: 24px; text-align: center; margin: 24px 0;">
      <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #166534; margin-bottom: 8px;">
        Your Verification Code
      </div>
      <div style="font-size: 36px; font-weight: 900; letter-spacing: 10px; color: #1b5e3b; font-family: 'Courier New', Courier, monospace; line-height: 1.2;">
        ${escapeHtml(otp)}
      </div>
    </div>

    <!-- Security Alert -->
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
  `;

  const htmlContent = wrapInBaseTemplate({
    preheader: `Your PharmaLoop verification code is ${otp}. Valid for 10 minutes.`,
    title: "Verify your email address",
    greeting,
    contentHtml,
  });

  const textContent = `PharmaLoop\n\n${greeting} welcome to PharmaLoop!\n\nYour 6-digit email verification code is:\n\n${otp}\n\nThis code expires in 10 minutes.\nFor security reasons, do not share this code with anyone.\n\nIf you did not request this, you can safely ignore this email.\n\nPharmaLoop Healthcare`;

  const result = await sendBrevoEmail({
    to,
    name,
    subject: "Verify your email - PharmaLoop",
    htmlContent,
    textContent,
    emailType: "Verification OTP",
  });

  if (!result.success) {
    throw new Error(result.error || "BREVO_DELIVERY_FAILED");
  }

  return { success: true, messageId: result.messageId };
}

export interface SendPasswordResetEmailParams {
  to: string;
  otp: string;
  name?: string;
}

/**
 * 2. Send Password Reset OTP Email.
 * Note: Throws on failure or missing config so password reset handler can report it.
 */
export async function sendPasswordResetEmail(
  params: SendPasswordResetEmailParams
): Promise<{ success: boolean; messageId?: string }> {
  const { to, otp, name } = params;
  if (!to || !otp) {
    throw new Error("INVALID_EMAIL_PARAMS: Recipient email and OTP are required.");
  }

  const client = getBrevoClient();
  if (!client) {
    const errorMsg = "BREVO_NOT_CONFIGURED: BREVO_API_KEY is not configured in environment variables.";
    console.error(`[EmailService] Aborted password reset dispatch to ${maskEmail(to)}: ${errorMsg}`);
    throw new Error(errorMsg);
  }

  const greeting = name?.trim() ? `Hi ${name.trim()},` : "Hello,";

  const contentHtml = `
    <p style="font-size: 14px; color: #64748b; margin: 0 0 20px 0; line-height: 1.6;">
      We received a request to reset your PharmaLoop account password. Use the 6-digit verification code below to authorize your password change:
    </p>

    <!-- OTP Callout Box -->
    <div style="background-color: #f1f8f4; border: 1px solid #cce8d7; border-radius: 16px; padding: 24px; text-align: center; margin: 24px 0;">
      <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #166534; margin-bottom: 8px;">
        Password Reset Code
      </div>
      <div style="font-size: 36px; font-weight: 900; letter-spacing: 10px; color: #1b5e3b; font-family: 'Courier New', Courier, monospace; line-height: 1.2;">
        ${escapeHtml(otp)}
      </div>
    </div>

    <!-- Security Alert -->
    <table role="presentation" border="0" cellspacing="0" cellpadding="0" style="width: 100%; margin-top: 20px; background-color: #fffbeb; border-radius: 12px; padding: 14px 16px; border: 1px solid #fef3c7;">
      <tr>
        <td style="vertical-align: top; width: 24px;">
          <span style="font-size: 16px;">⏱️</span>
        </td>
        <td style="font-size: 13px; color: #92400e; line-height: 1.5; padding-left: 8px;">
          <strong>This code expires in 10 minutes.</strong><br>
          For your security, never share this code with anyone. If you did not request a password reset, you can safely ignore this email.
        </td>
      </tr>
    </table>

    <p style="font-size: 12px; color: #94a3b8; margin: 24px 0 0 0; line-height: 1.5; border-top: 1px solid #f1f5f9; padding-top: 16px;">
      Your password will not change until you verify this code and create a new password.
    </p>
  `;

  const htmlContent = wrapInBaseTemplate({
    preheader: `Your PharmaLoop password reset code is ${otp}. Valid for 10 minutes.`,
    title: "Reset your PharmaLoop password",
    greeting,
    contentHtml,
  });

  const textContent = `PharmaLoop\n\n${greeting} we received a request to reset your password.\n\nYour 6-digit password reset code is:\n\n${otp}\n\nThis code expires in 10 minutes.\nFor your security, never share this code with anyone.\nIf you did not request a password reset, please ignore this email.\n\nPharmaLoop Healthcare`;

  const result = await sendBrevoEmail({
    to,
    name,
    subject: "Reset your PharmaLoop password",
    htmlContent,
    textContent,
    emailType: "Password Reset OTP",
  });

  if (!result.success) {
    throw new Error(result.error || "BREVO_DELIVERY_FAILED");
  }

  return { success: true, messageId: result.messageId };
}

export interface SendWelcomeEmailParams {
  to: string;
  name?: string;
}

/**
 * 3. Send Welcome Email upon successful registration/verification.
 * Non-blocking side effect: errors are safely swallowed and logged.
 */
export async function sendWelcomeEmail(
  params: SendWelcomeEmailParams
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const { to, name } = params;
    const greeting = name?.trim() ? `Hi ${name.trim()},` : "Hello,";

    const contentHtml = `
      <p style="font-size: 15px; color: #475569; margin: 0 0 20px 0; line-height: 1.6;">
        Welcome to <strong>PharmaLoop</strong>! Your account is fully active and verified.
      </p>

      <div style="background-color: #f8fafc; border-radius: 16px; padding: 20px; margin: 20px 0; border: 1px solid #e2e8f0;">
        <h3 style="font-size: 15px; font-weight: 700; color: #0f172a; margin: 0 0 12px 0;">Here is what you can do with PharmaLoop:</h3>
        <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #475569; line-height: 1.8;">
          <li><strong>Never run out of medicines:</strong> Set up automated refill subscriptions delivered straight to your door.</li>
          <li><strong>Authentic healthcare:</strong> 100% verified medications stored in certified temperature-controlled conditions.</li>
          <li><strong>Live tracking:</strong> Follow your orders from dispatch to doorstep in real time.</li>
        </ul>
      </div>

      <p style="font-size: 14px; color: #64748b; margin: 24px 0 0 0; line-height: 1.6;">
        Need assistance with your orders or prescriptions? Reply directly to this email or visit your account dashboard anytime.
      </p>
    `;

    const htmlContent = wrapInBaseTemplate({
      preheader: "Welcome to PharmaLoop! Your account is now active.",
      title: "Welcome to PharmaLoop! 🍃",
      greeting,
      contentHtml,
    });

    const textContent = `PharmaLoop\n\n${greeting} welcome to PharmaLoop!\n\nYour account is now verified and active.\n\nYou can set up medicine auto-refills, track deliveries, and manage your health seamlessly.\n\nThank you for choosing PharmaLoop Healthcare!`;

    return await sendBrevoEmail({
      to,
      name,
      subject: "Welcome to PharmaLoop!",
      htmlContent,
      textContent,
      emailType: "Welcome",
    });
  } catch (err) {
    console.error("[EmailService] Unexpected error sending welcome email:", err);
    return { success: false, error: String(err) };
  }
}

export interface OrderItemSummary {
  name: string;
  quantity: number;
  price: string | number;
}

export interface SendOrderConfirmationParams {
  to: string;
  name?: string;
  orderId: string;
  items: OrderItemSummary[];
  total: string | number;
  paymentMethod?: string;
  shippingAddress?: string;
}

/**
 * 4. Send Order Confirmation Email.
 * Non-blocking side effect: errors are safely swallowed and logged.
 */
export async function sendOrderConfirmationEmail(
  params: SendOrderConfirmationParams
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const { to, name, orderId, items, total, paymentMethod, shippingAddress } = params;
    const greeting = name?.trim() ? `Hi ${name.trim()},` : "Hello,";
    const shortId = orderId.slice(-8).toUpperCase();

    const itemsRowsHtml = items
      .map(
        (item) => `
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; color: #1e293b;">
            ${escapeHtml(item.name)} <span style="color: #64748b;">&times; ${escapeHtml(item.quantity)}</span>
          </td>
          <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; color: #0f172a; text-align: right; font-weight: 600;">
            ₹${Number(item.price).toFixed(2)}
          </td>
        </tr>`
      )
      .join("");

    const contentHtml = `
      <p style="font-size: 15px; color: #475569; margin: 0 0 20px 0; line-height: 1.6;">
        Thank you for your order! We have received your order <strong>#${escapeHtml(shortId)}</strong> and our pharmacy team is preparing it.
      </p>

      <!-- Order Details Card -->
      <div style="background-color: #f8fafc; border-radius: 16px; padding: 24px; margin: 20px 0; border: 1px solid #e2e8f0;">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 16px;">
          <tr>
            <td style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #64748b;">Order Number</td>
            <td style="font-size: 14px; font-weight: 700; color: #0f172a; text-align: right;">#${escapeHtml(shortId)}</td>
          </tr>
          ${paymentMethod ? `<tr>
            <td style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #64748b; padding-top: 6px;">Payment Method</td>
            <td style="font-size: 13px; color: #475569; text-align: right; padding-top: 6px;">${escapeHtml(paymentMethod)}</td>
          </tr>` : ""}
        </table>

        <div style="border-top: 1px solid #e2e8f0; padding-top: 12px;">
          <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
            ${itemsRowsHtml}
            <tr>
              <td style="padding: 16px 0 0 0; font-size: 16px; font-weight: 800; color: #0f172a;">Total</td>
              <td style="padding: 16px 0 0 0; font-size: 18px; font-weight: 800; color: #1b5e3b; text-align: right;">₹${Number(total).toFixed(2)}</td>
            </tr>
          </table>
        </div>
      </div>

      ${shippingAddress ? `
      <div style="font-size: 13px; color: #64748b; margin-top: 16px; line-height: 1.5;">
        <strong style="color: #334155;">Delivering to:</strong><br>
        ${escapeHtml(shippingAddress)}
      </div>` : ""}
    `;

    const htmlContent = wrapInBaseTemplate({
      preheader: `Order #${shortId} confirmed! Total: ₹${Number(total).toFixed(2)}`,
      title: `Order Confirmed #${shortId}`,
      greeting,
      contentHtml,
    });

    const itemsText = items.map((it) => `- ${it.name} x ${it.quantity}: ₹${Number(it.price).toFixed(2)}`).join("\n");
    const textContent = `PharmaLoop\n\n${greeting} thank you for your order!\n\nOrder #${shortId}\nTotal: ₹${Number(total).toFixed(2)}\nPayment: ${paymentMethod || "N/A"}\n\nItems:\n${itemsText}\n\nWe will notify you when your order is shipped.\n\nPharmaLoop Healthcare`;

    return await sendBrevoEmail({
      to,
      name,
      subject: `Order Confirmed #${shortId} - PharmaLoop`,
      htmlContent,
      textContent,
      emailType: "Order Confirmation",
    });
  } catch (err) {
    console.error("[EmailService] Unexpected error sending order confirmation email:", err);
    return { success: false, error: String(err) };
  }
}

export interface SendPaymentSuccessParams {
  to: string;
  name?: string;
  orderId: string;
  paymentId: string;
  amount: string | number;
}

/**
 * 5. Send Payment Success Email.
 * Non-blocking side effect: errors are safely swallowed and logged.
 */
export async function sendPaymentSuccessEmail(
  params: SendPaymentSuccessParams
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const { to, name, orderId, paymentId, amount } = params;
    const greeting = name?.trim() ? `Hi ${name.trim()},` : "Hello,";
    const shortOrderId = orderId.slice(-8).toUpperCase();

    const contentHtml = `
      <p style="font-size: 15px; color: #475569; margin: 0 0 20px 0; line-height: 1.6;">
        Your payment of <strong style="color: #1b5e3b;">₹${Number(amount).toFixed(2)}</strong> has been verified successfully.
      </p>

      <div style="background-color: #f1f8f4; border: 1px solid #cce8d7; border-radius: 16px; padding: 24px; margin: 20px 0;">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
          <tr>
            <td style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: #166534; padding-bottom: 8px;">Order Reference</td>
            <td style="font-size: 14px; font-weight: 700; color: #0f172a; text-align: right; padding-bottom: 8px;">#${escapeHtml(shortOrderId)}</td>
          </tr>
          <tr>
            <td style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: #166534; padding-bottom: 8px;">Transaction ID</td>
            <td style="font-size: 13px; font-family: monospace; color: #334155; text-align: right; padding-bottom: 8px;">${escapeHtml(paymentId)}</td>
          </tr>
          <tr>
            <td style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: #166534;">Amount Paid</td>
            <td style="font-size: 16px; font-weight: 800; color: #1b5e3b; text-align: right;">₹${Number(amount).toFixed(2)}</td>
          </tr>
        </table>
      </div>

      <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
        A copy of your tax invoice will be generated and made available in your account orders page.
      </p>
    `;

    const htmlContent = wrapInBaseTemplate({
      preheader: `Payment of ₹${Number(amount).toFixed(2)} received for order #${shortOrderId}.`,
      title: "Payment Received Successfully ✅",
      greeting,
      contentHtml,
    });

    const textContent = `PharmaLoop\n\n${greeting} your payment of ₹${Number(amount).toFixed(2)} for Order #${shortOrderId} was successful.\n\nTransaction ID: ${paymentId}\n\nThank you for choosing PharmaLoop Healthcare!`;

    return await sendBrevoEmail({
      to,
      name,
      subject: `Payment Successful for Order #${shortOrderId} - PharmaLoop`,
      htmlContent,
      textContent,
      emailType: "Payment Success",
    });
  } catch (err) {
    console.error("[EmailService] Unexpected error sending payment success email:", err);
    return { success: false, error: String(err) };
  }
}

export interface SendPaymentFailedParams {
  to: string;
  name?: string;
  orderId: string;
  attemptCount: number;
  maxRetries: number;
  reason?: string;
}

/**
 * 6. Send Payment Failed Email.
 * Non-blocking side effect: errors are safely swallowed and logged.
 */
export async function sendPaymentFailedEmail(
  params: SendPaymentFailedParams
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const { to, name, orderId, attemptCount, maxRetries, reason } = params;
    const greeting = name?.trim() ? `Hi ${name.trim()},` : "Hello,";
    const shortOrderId = orderId.slice(-8).toUpperCase();
    const isExhausted = attemptCount >= maxRetries;

    const contentHtml = `
      <p style="font-size: 15px; color: #475569; margin: 0 0 20px 0; line-height: 1.6;">
        We were unable to process your payment for order <strong>#${escapeHtml(shortOrderId)}</strong>.
      </p>

      <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 16px; padding: 20px; margin: 20px 0;">
        <div style="font-size: 13px; font-weight: 700; color: #991b1b; margin-bottom: 6px;">
          ${isExhausted ? "Retry Limit Exceeded" : `Payment Attempt ${attemptCount} of ${maxRetries} Failed`}
        </div>
        <p style="font-size: 13px; color: #7f1d1d; margin: 0; line-height: 1.5;">
          ${escapeHtml(reason || "The payment transaction was not approved by your payment provider.")}
        </p>
      </div>

      <p style="font-size: 14px; color: #475569; line-height: 1.6;">
        ${
          isExhausted
            ? "Your order has been paused or cancelled to release reserved stock. Please log in to your dashboard to retry with a different payment method."
            : "You can retry this payment from your orders dashboard using a different card or UPI."
        }
      </p>
    `;

    const htmlContent = wrapInBaseTemplate({
      preheader: `Payment attempt failed for order #${shortOrderId}.`,
      title: "Action Required: Payment Failed",
      greeting,
      contentHtml,
    });

    const textContent = `PharmaLoop\n\n${greeting} your payment for Order #${shortOrderId} could not be processed.\nAttempt: ${attemptCount} of ${maxRetries}\nReason: ${reason || "Transaction declined"}\n\nPlease visit your dashboard to retry payment.\n\nPharmaLoop Healthcare`;

    return await sendBrevoEmail({
      to,
      name,
      subject: `Payment Failed for Order #${shortOrderId} - PharmaLoop`,
      htmlContent,
      textContent,
      emailType: "Payment Failure",
    });
  } catch (err) {
    console.error("[EmailService] Unexpected error sending payment failed email:", err);
    return { success: false, error: String(err) };
  }
}

export interface SendStatusUpdateParams {
  to: string;
  name?: string;
  orderId: string;
  status: "CONFIRMED" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED";
}

/**
 * 7. Send Delivery/Order Status Progression Email.
 * Non-blocking side effect: errors are safely swallowed and logged.
 */
export async function sendStatusUpdateEmail(
  params: SendStatusUpdateParams
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const { to, name, orderId, status } = params;
    const greeting = name?.trim() ? `Hi ${name.trim()},` : "Hello,";
    const shortOrderId = orderId.slice(-8).toUpperCase();

    const statusDescriptions: Record<string, { title: string; desc: string; icon: string }> = {
      PROCESSING: {
        title: "Order is Being Packed",
        desc: "Our registered pharmacists are packing your medications in secure, tamper-evident packaging.",
        icon: "📦",
      },
      SHIPPED: {
        title: "Order Dispatched & On the Way",
        desc: "Your order is with our courier partner and heading to your delivery address.",
        icon: "🚚",
      },
      DELIVERED: {
        title: "Order Delivered Successfully",
        desc: "Your order has been safely delivered to your address. Thank you for choosing PharmaLoop!",
        icon: "🏡",
      },
      CANCELLED: {
        title: "Order Cancelled",
        desc: "Your order has been cancelled. Any applicable refunds will be processed according to your payment method.",
        icon: "❌",
      },
    };

    const details = statusDescriptions[status] || {
      title: `Order Status Updated: ${status}`,
      desc: `Your order status has been updated to ${status.toLowerCase()}.`,
      icon: "ℹ️",
    };

    const contentHtml = `
      <div style="background-color: #f8fafc; border-radius: 16px; padding: 24px; margin: 20px 0; border: 1px solid #e2e8f0; text-align: center;">
        <div style="font-size: 36px; margin-bottom: 12px;">${details.icon}</div>
        <h2 style="font-size: 18px; font-weight: 800; color: #0f172a; margin: 0 0 8px 0;">${escapeHtml(details.title)}</h2>
        <p style="font-size: 14px; color: #64748b; margin: 0 0 16px 0; line-height: 1.6;">${escapeHtml(details.desc)}</p>
        <div style="display: inline-block; background-color: #1b5e3b; color: #ffffff; padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 700; letter-spacing: 0.5px;">
          ORDER #${escapeHtml(shortOrderId)} &bull; ${escapeHtml(status)}
        </div>
      </div>
    `;

    const htmlContent = wrapInBaseTemplate({
      preheader: `Order #${shortOrderId} status update: ${details.title}.`,
      title: details.title,
      greeting,
      contentHtml,
    });

    const textContent = `PharmaLoop\n\n${greeting} update on your order #${shortOrderId}:\n\nStatus: ${status}\n${details.desc}\n\nPharmaLoop Healthcare`;

    return await sendBrevoEmail({
      to,
      name,
      subject: `Order #${shortOrderId} Update: ${details.title} - PharmaLoop`,
      htmlContent,
      textContent,
      emailType: `Status Update (${status})`,
    });
  } catch (err) {
    console.error("[EmailService] Unexpected error sending status update email:", err);
    return { success: false, error: String(err) };
  }
}

/**
 * Single export object for convenient consumption across the application.
 */
export const emailService = {
  getSender,
  verifyDiagnostics: verifyBrevoApi,
  verifyBrevoApi,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendOrderConfirmationEmail,
  sendPaymentSuccessEmail,
  sendPaymentFailedEmail,
  sendStatusUpdateEmail,
};

export default emailService;
