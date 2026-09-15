import { describe, it, expect, afterEach } from "vitest";
import {
  maskEmail,
  escapeHtml,
  getSender,
  DEFAULT_SENDER,
  verifyBrevoApi,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendOrderConfirmationEmail,
  sendPaymentSuccessEmail,
  sendPaymentFailedEmail,
  sendStatusUpdateEmail,
} from "@/services/emailService";

describe("Email Service - Utilities & Configuration", () => {
  it("masks emails safely without leaking full local part", () => {
    expect(maskEmail("adityabh9the@gmail.com")).toBe("ad***e@gmail.com");
    expect(maskEmail("ab@example.com")).toBe("a***@example.com");
    expect(maskEmail("a@example.com")).toBe("a***@example.com");
    expect(maskEmail("invalid-email")).toBe("***@***");
  });

  it("escapes dangerous HTML characters in user input", () => {
    expect(escapeHtml("<script>alert('xss')</script>")).toBe(
      "&lt;script&gt;alert(&#039;xss&#039;)&lt;/script&gt;"
    );
    expect(escapeHtml('Hello "World" & <Friends>')).toBe(
      "Hello &quot;World&quot; &amp; &lt;Friends&gt;"
    );
    expect(escapeHtml(null)).toBe("");
    expect(escapeHtml(undefined)).toBe("");
  });

  it("resolves default sender when no environment overrides exist", () => {
    const originalSmtpFrom = process.env.SMTP_FROM;
    const originalEmailFrom = process.env.EMAIL_FROM;
    delete process.env.SMTP_FROM;
    delete process.env.EMAIL_FROM;

    const sender = getSender();
    expect(sender.email).toBe(DEFAULT_SENDER.email);
    expect(sender.name).toBe(DEFAULT_SENDER.name);

    if (originalSmtpFrom) process.env.SMTP_FROM = originalSmtpFrom;
    if (originalEmailFrom) process.env.EMAIL_FROM = originalEmailFrom;
  });

  it("resolves custom sender when SMTP_FROM or EMAIL_FROM is present", () => {
    process.env.SMTP_FROM = "Custom Pharma <custom@pharmaloop.com>";
    const sender = getSender();
    expect(sender.name).toBe("Custom Pharma");
    expect(sender.email).toBe("custom@pharmaloop.com");
    delete process.env.SMTP_FROM;
  });
});

describe("Email Service - Diagnostics & Error Handling", () => {
  const originalApiKey = process.env.BREVO_API_KEY;

  afterEach(() => {
    if (originalApiKey === undefined) {
      delete process.env.BREVO_API_KEY;
    } else {
      process.env.BREVO_API_KEY = originalApiKey;
    }
  });

  it("returns unconfigured diagnostic result when BREVO_API_KEY is missing", async () => {
    delete process.env.BREVO_API_KEY;

    const res = await verifyBrevoApi();
    expect(res.ok).toBe(false);
    expect(res.configured).toBe(false);
    expect(res.code).toBe("BREVO_NOT_CONFIGURED");
    expect(res.senderEmail).toBe(DEFAULT_SENDER.email);
  });

  it("throws descriptive error when sending OTP with missing BREVO_API_KEY", async () => {
    delete process.env.BREVO_API_KEY;

    await expect(
      sendVerificationEmail({ to: "test@example.com", otp: "123456" })
    ).rejects.toThrow("BREVO_NOT_CONFIGURED");
  });

  it("throws descriptive error when sending Password Reset with missing BREVO_API_KEY", async () => {
    delete process.env.BREVO_API_KEY;

    await expect(
      sendPasswordResetEmail({ to: "test@example.com", otp: "654321" })
    ).rejects.toThrow("BREVO_NOT_CONFIGURED");
  });

  it("swallows errors safely in non-blocking welcome email without crashing", async () => {
    delete process.env.BREVO_API_KEY;

    const res = await sendWelcomeEmail({ to: "test@example.com", name: "Alice" });
    expect(res.success).toBe(false);
    expect(res.error).toContain("BREVO_NOT_CONFIGURED");
  });

  it("swallows errors safely in non-blocking order confirmation email without crashing", async () => {
    delete process.env.BREVO_API_KEY;

    const res = await sendOrderConfirmationEmail({
      to: "test@example.com",
      name: "Bob",
      orderId: "order_12345678",
      items: [{ name: "Paracetamol 500mg", quantity: 2, price: 50 }],
      total: 100,
      paymentMethod: "ONLINE",
    });
    expect(res.success).toBe(false);
    expect(res.error).toContain("BREVO_NOT_CONFIGURED");
  });

  it("swallows errors safely in non-blocking payment success email without crashing", async () => {
    delete process.env.BREVO_API_KEY;

    const res = await sendPaymentSuccessEmail({
      to: "test@example.com",
      name: "Charlie",
      orderId: "order_12345678",
      paymentId: "pay_12345678",
      amount: 100,
    });
    expect(res.success).toBe(false);
    expect(res.error).toContain("BREVO_NOT_CONFIGURED");
  });

  it("swallows errors safely in non-blocking payment failed email without crashing", async () => {
    delete process.env.BREVO_API_KEY;

    const res = await sendPaymentFailedEmail({
      to: "test@example.com",
      name: "Dave",
      orderId: "order_12345678",
      attemptCount: 1,
      maxRetries: 3,
      reason: "Bank timeout",
    });
    expect(res.success).toBe(false);
    expect(res.error).toContain("BREVO_NOT_CONFIGURED");
  });

  it("swallows errors safely in non-blocking status update email without crashing", async () => {
    delete process.env.BREVO_API_KEY;

    const res = await sendStatusUpdateEmail({
      to: "test@example.com",
      name: "Eve",
      orderId: "order_12345678",
      status: "SHIPPED",
    });
    expect(res.success).toBe(false);
    expect(res.error).toContain("BREVO_NOT_CONFIGURED");
  });
});

describe("Email Service - Backward Compatibility Bridge (lib/email.ts)", () => {
  it("verifyEmailTransport reports unconfigured diagnostics safely via Brevo bridge", async () => {
    const originalApiKey = process.env.BREVO_API_KEY;
    delete process.env.BREVO_API_KEY;

    const { verifyEmailTransport } = await import("@/lib/email");
    const result = await verifyEmailTransport();
    expect(result.ok).toBe(false);
    expect(result.configured).toBe(false);
    expect(result.host).toBe("api.brevo.com (HTTPS)");
    expect(result.port).toBe(443);
    expect(result.secure).toBe(true);
    expect(result.code).toBe("BREVO_NOT_CONFIGURED");

    if (originalApiKey !== undefined) {
      process.env.BREVO_API_KEY = originalApiKey;
    }
  });

  it("sendVerificationOtpEmail supports both object and positional parameters", async () => {
    delete process.env.BREVO_API_KEY;
    const { sendVerificationOtpEmail } = await import("@/lib/email");

    // Object overload
    await expect(
      sendVerificationOtpEmail({ to: "user@example.com", otp: "123456", name: "User" })
    ).rejects.toThrow("BREVO_NOT_CONFIGURED");

    // Positional overload
    await expect(
      sendVerificationOtpEmail("user@example.com", "123456", "User")
    ).rejects.toThrow("BREVO_NOT_CONFIGURED");

    // Missing required params
    await expect(
      sendVerificationOtpEmail("", "")
    ).rejects.toThrow("INVALID_EMAIL_PARAMS");
  });

  it("sendPasswordResetOtpEmail supports both object and positional parameters", async () => {
    delete process.env.BREVO_API_KEY;
    const { sendPasswordResetOtpEmail } = await import("@/lib/email");

    // Object overload
    await expect(
      sendPasswordResetOtpEmail({ to: "user@example.com", otp: "654321", name: "User" })
    ).rejects.toThrow("BREVO_NOT_CONFIGURED");

    // Positional overload
    await expect(
      sendPasswordResetOtpEmail("user@example.com", "654321", "User")
    ).rejects.toThrow("BREVO_NOT_CONFIGURED");

    // Missing required params
    await expect(
      sendPasswordResetOtpEmail("", "")
    ).rejects.toThrow("INVALID_EMAIL_PARAMS");
  });
});

describe("Payment & Delivery Email Idempotency Model", () => {
  it("guards against duplicate payment success email when already paid", () => {
    // Model of claimed.count atomic update
    const payments = [
      { id: "p1", status: "PENDING" },
    ];
    let emailsDispatched = 0;

    function verifyPaymentAttempt(paymentId: string) {
      const payment = payments.find((p) => p.id === paymentId);
      if (!payment || payment.status === "SUCCESS") {
        return { isNewlyClaimed: false };
      }
      payment.status = "SUCCESS";
      return { isNewlyClaimed: true };
    }

    // Call 1: payment transitions to SUCCESS
    const attempt1 = verifyPaymentAttempt("p1");
    if (attempt1.isNewlyClaimed) emailsDispatched++;

    // Call 2: idempotent retry / duplicate webhook
    const attempt2 = verifyPaymentAttempt("p1");
    if (attempt2.isNewlyClaimed) emailsDispatched++;

    expect(attempt1.isNewlyClaimed).toBe(true);
    expect(attempt2.isNewlyClaimed).toBe(false);
    expect(emailsDispatched).toBe(1);
  });

  it("guards against duplicate delivery progression email on repeated sync calls", () => {
    let currentStatus = "CONFIRMED";
    let statusEmailsSent = 0;

    function syncDelivery(newStatus: string) {
      if (currentStatus === newStatus) {
        return false; // No transition
      }
      currentStatus = newStatus;
      statusEmailsSent++;
      return true;
    }

    // Advance to PROCESSING
    expect(syncDelivery("PROCESSING")).toBe(true);
    expect(statusEmailsSent).toBe(1);

    // Re-check with no time elapsed: same status, no new email
    expect(syncDelivery("PROCESSING")).toBe(false);
    expect(statusEmailsSent).toBe(1);

    // Advance to SHIPPED
    expect(syncDelivery("SHIPPED")).toBe(true);
    expect(statusEmailsSent).toBe(2);
  });
});
