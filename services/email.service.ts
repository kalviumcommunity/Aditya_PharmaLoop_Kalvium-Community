import {
  sendVerificationOtpEmail,
  getEmailTransporter,
  verifyEmailTransport,
} from "@/lib/email";

export interface SendOtpEmailOptions {
  to: string;
  name?: string;
  otp: string;
}

export const emailService = {
  getTransporter() {
    return getEmailTransporter();
  },

  async verifyTransport() {
    return verifyEmailTransport();
  },

  async sendOtpEmail({ to, name, otp }: SendOtpEmailOptions): Promise<{ success: boolean; messageId?: string }> {
    return sendVerificationOtpEmail({ to, name, otp });
  },
};
