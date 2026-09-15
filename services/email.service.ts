import {
  emailService as centralizedEmailService,
  sendVerificationEmail,
  verifyBrevoApi,
  maskEmail,
  DEFAULT_SENDER,
  getSender,
  getBrevoClient,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendOrderConfirmationEmail,
  sendPaymentSuccessEmail,
  sendPaymentFailedEmail,
  sendStatusUpdateEmail,
  SendVerificationEmailParams,
  SendPasswordResetEmailParams,
  SendWelcomeEmailParams,
  SendOrderConfirmationParams,
  SendPaymentSuccessParams,
  SendPaymentFailedParams,
  SendStatusUpdateParams,
  BrevoDiagnosticsResult,
} from "./emailService";

export interface SendOtpEmailOptions {
  to: string;
  name?: string;
  otp: string;
}

/**
 * Backwards compatibility wrapper for email.service.ts.
 * Re-exports the centralized Brevo email service and backward-compatible methods.
 */
export const emailService = {
  ...centralizedEmailService,

  async verifyTransport(): Promise<BrevoDiagnosticsResult> {
    return verifyBrevoApi();
  },

  async sendOtpEmail({ to, name, otp }: SendOtpEmailOptions): Promise<{ success: boolean; messageId?: string }> {
    return sendVerificationEmail({ to, name, otp });
  },
};

export {
  sendVerificationEmail,
  verifyBrevoApi,
  maskEmail,
  DEFAULT_SENDER,
  getSender,
  getBrevoClient,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendOrderConfirmationEmail,
  sendPaymentSuccessEmail,
  sendPaymentFailedEmail,
  sendStatusUpdateEmail,
};

export type {
  SendVerificationEmailParams,
  SendPasswordResetEmailParams,
  SendWelcomeEmailParams,
  SendOrderConfirmationParams,
  SendPaymentSuccessParams,
  SendPaymentFailedParams,
  SendStatusUpdateParams,
  BrevoDiagnosticsResult,
};

export default emailService;
