import Razorpay from "razorpay";

export const RAZORPAY_CURRENCY = "INR";

export function getRazorpayClient() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error("RAZORPAY_NOT_CONFIGURED");
  }

  if (!keyId.startsWith("rzp_test_")) {
    throw new Error("RAZORPAY_TEST_KEY_REQUIRED");
  }

  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

export function getRazorpayKeyId() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  if (!keyId) throw new Error("RAZORPAY_NOT_CONFIGURED");
  if (!keyId.startsWith("rzp_test_"))
    throw new Error("RAZORPAY_TEST_KEY_REQUIRED");
  return keyId;
}
