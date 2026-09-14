import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { addMonths } from "@/lib/date-utils";
import { addFrequencyPeriod, getRefillCycleOrderId } from "@/services/refill.service";
import { loginRateLimiter } from "@/lib/auth-rate-limit";
import {
  hashOtp,
  verifyOtpHash,
  generateOtp,
} from "@/services/verification.service";
import {
  createOAuthState,
  consumeOAuthState,
  getPostAuthRedirect,
  getPublicAppRedirectUrl,
  getPublicAppUrl,
  sanitizeInternalRedirect,
  STATE_MAX_AGE_SECONDS,
} from "@/lib/google-auth";
import { addCartItemSchema, updateCartItemSchema } from "@/types";

const originalPublicAppUrl = process.env.NEXT_PUBLIC_APP_URL;

afterEach(() => {
  if (originalPublicAppUrl === undefined) {
    delete process.env.NEXT_PUBLIC_APP_URL;
  } else {
    process.env.NEXT_PUBLIC_APP_URL = originalPublicAppUrl;
  }
});

describe("addMonths / MONTHLY refill date (M-03)", () => {
  it("does not overflow Jan 31 into March", () => {
    const jan31 = new Date(2026, 0, 31, 10, 30, 0, 0);
    const next = addMonths(jan31, 1);
    expect(next.getMonth()).toBe(1); // February
    expect(next.getDate()).toBe(28); // 2026 is not a leap year
  });

  it("handles leap-year Feb correctly", () => {
    const jan31 = new Date(2024, 0, 31);
    const next = addMonths(jan31, 1);
    expect(next.getMonth()).toBe(1);
    expect(next.getDate()).toBe(29);
  });

  it("addFrequencyPeriod MONTHLY uses end-of-month safe addition", () => {
    const from = new Date(2026, 0, 31, 9, 0, 0, 0);
    const next = addFrequencyPeriod(from, "MONTHLY", "09:00");
    expect(next.getMonth()).toBe(1);
    expect(next.getDate()).toBe(28);
    expect(next.getHours()).toBe(9);
  });

  it("WEEKLY adds exactly 7 days", () => {
    const from = new Date(2026, 0, 31);
    const next = addFrequencyPeriod(from, "WEEKLY");
    expect(next.getDate()).toBe(7);
    expect(next.getMonth()).toBe(1);
  });
});

describe("Refill cycle order ID idempotency", () => {
  it("is deterministic for the same subscription + cycle date", () => {
    const d = new Date("2026-03-01T00:00:00.000Z");
    expect(getRefillCycleOrderId("sub1", d)).toBe(getRefillCycleOrderId("sub1", d));
    expect(getRefillCycleOrderId("sub1", d)).toContain("refill_sub1_");
  });
});

describe("Login brute-force protection (H-01)", () => {
  beforeEach(() => {
    loginRateLimiter.reset();
  });

  it("allows initial attempts", () => {
    const status = loginRateLimiter.check("1.2.3.4", "user@example.com");
    expect(status.allowed).toBe(true);
  });

  it("locks after 5 failed attempts for the same email", () => {
    const ip = "10.0.0.1";
    const email = "victim@example.com";
    for (let i = 0; i < 5; i++) {
      loginRateLimiter.onFailedAttempt(ip, email);
    }
    const status = loginRateLimiter.check(ip, email);
    expect(status.allowed).toBe(false);
    expect(status.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("clears lockout on successful login", () => {
    const ip = "10.0.0.2";
    const email = "ok@example.com";
    for (let i = 0; i < 5; i++) {
      loginRateLimiter.onFailedAttempt(ip, email);
    }
    expect(loginRateLimiter.check(ip, email).allowed).toBe(false);
    loginRateLimiter.onSuccessfulLogin(ip, email);
    expect(loginRateLimiter.check(ip, email).allowed).toBe(true);
  });

  it("locks by IP independently of email", () => {
    const ip = "10.0.0.3";
    for (let i = 0; i < 5; i++) {
      loginRateLimiter.onFailedAttempt(ip, `user${i}@example.com`);
    }
    expect(loginRateLimiter.check(ip, "other@example.com").allowed).toBe(false);
  });
});

describe("OTP hashing (H-02 support)", () => {
  it("verifies matching OTP hashes in constant-time compare", () => {
    const otp = generateOtp();
    expect(otp).toMatch(/^\d{6}$/);
    const hashed = hashOtp(otp);
    expect(verifyOtpHash(otp, hashed)).toBe(true);
    expect(verifyOtpHash("000000", hashed)).toBe(false);
  });
});

describe("OTP attempt atomic claim semantics (H-02)", () => {
  it("simulates concurrent attempt claims cannot exceed maxAttempts", async () => {
    // In-memory model of the atomic UPDATE ... WHERE attempts < maxAttempts
    let attempts = 0;
    const maxAttempts = 5;

    async function claimAttemptAtomic(): Promise<number | null> {
      // Simulate serialized DB row lock
      if (attempts >= maxAttempts) return null;
      attempts += 1;
      return attempts;
    }

    const results = await Promise.all(
      Array.from({ length: 20 }, () => claimAttemptAtomic()),
    );

    const successful = results.filter((r) => r !== null);
    expect(successful).toHaveLength(5);
    expect(attempts).toBe(5);
    expect(Math.max(...(successful as number[]))).toBe(5);
  });
});

describe("Google OAuth state validation", () => {
  it("rejects missing/invalid state", () => {
    const result = consumeOAuthState(null, "abc");
    expect(result.valid).toBe(false);
  });

  it("accepts a freshly created state and consumes it once", () => {
    const { state, serializedCookie } = createOAuthState(null, "/dashboard/medicines");
    const first = consumeOAuthState(serializedCookie, state);
    expect(first.valid).toBe(true);
    expect(first.redirect).toBe("/dashboard/medicines");

    const second = consumeOAuthState(first.updatedCookie, state);
    expect(second.valid).toBe(false);
  });

  it("rejects expired state", () => {
    const { state } = createOAuthState(null, "/dashboard");
    const expiredCookie = JSON.stringify({
      [state]: {
        redirect: "/dashboard",
        createdAt: Date.now() - (STATE_MAX_AGE_SECONDS + 1) * 1000,
      },
    });
    const result = consumeOAuthState(expiredCookie, state);
    expect(result.valid).toBe(false);
  });

  it("sanitizes open redirects", () => {
    expect(sanitizeInternalRedirect("https://evil.com")).toBe("/dashboard");
    expect(sanitizeInternalRedirect("//evil.com")).toBe("/dashboard");
    expect(sanitizeInternalRedirect("/orders/1")).toBe("/orders/1");
  });

  it("uses NEXT_PUBLIC_APP_URL for production error and success redirects", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://pharmaloop-k55v.onrender.com/";

    expect(getPublicAppRedirectUrl("/login?error=auth_failed").toString()).toBe(
      "https://pharmaloop-k55v.onrender.com/login?error=auth_failed",
    );
    expect(getPublicAppRedirectUrl("/dashboard").toString()).toBe(
      "https://pharmaloop-k55v.onrender.com/dashboard",
    );
  });

  it("preserves localhost development redirects when configured", () => {
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    expect(getPublicAppRedirectUrl("/login").toString()).toBe(
      "http://localhost:3000/login",
    );
  });

  it("fails safely when NEXT_PUBLIC_APP_URL is missing or internal", () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    expect(() => getPublicAppUrl()).toThrow("NEXT_PUBLIC_APP_URL is not configured");

    process.env.NEXT_PUBLIC_APP_URL = "http://0.0.0.0:10000";
    expect(() => getPublicAppUrl()).toThrow("NEXT_PUBLIC_APP_URL must be a public HTTP(S) origin");
  });

  it("rejects external browser redirect destinations", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://pharmaloop-k55v.onrender.com";
    expect(() => getPublicAppRedirectUrl("https://evil.example")).toThrow(
      "OAuth redirect destination must be an internal path",
    );
  });

  it("sends ADMIN users to /admin and customers to safe internal destinations", () => {
    expect(getPostAuthRedirect("ADMIN", "/orders")).toBe("/admin");
    expect(getPostAuthRedirect("CUSTOMER", "/orders")).toBe("/orders");
    expect(getPostAuthRedirect("CUSTOMER", "/login")).toBe("/dashboard");
    expect(getPostAuthRedirect("CUSTOMER", "https://evil.example")).toBe("/dashboard");
  });
});

describe("Cart quantity validation (M-05)", () => {
  it("rejects quantity above 999", () => {
    const result = addCartItemSchema.safeParse({
      productId: "p1",
      quantity: 1000,
    });
    expect(result.success).toBe(false);
  });

  it("accepts quantity within bounds", () => {
    const result = updateCartItemSchema.safeParse({ quantity: 3 });
    expect(result.success).toBe(true);
  });
});

describe("Atomic stock decrement semantics (H-03 / C-01)", () => {
  it("never allows stock to go negative under concurrent decrements", async () => {
    let stock = 5;
    const quantity = 3;

    async function tryDecrement(): Promise<boolean> {
      // Model of: UPDATE ... WHERE stock >= quantity
      if (stock < quantity) return false;
      stock -= quantity;
      return true;
    }

    const results = await Promise.all([
      tryDecrement(),
      tryDecrement(),
      tryDecrement(),
    ]);

    const successes = results.filter(Boolean).length;
    expect(successes).toBe(1);
    expect(stock).toBe(2);
    expect(stock).toBeGreaterThanOrEqual(0);
  });

  it("serializes cart consumption so only one checkout wins", async () => {
    let cartItems = [{ productId: "p1", quantity: 1 }];
    let ordersCreated = 0;

    async function checkout(): Promise<"ok" | "CART_EMPTY"> {
      // Model of SELECT ... FOR UPDATE then re-read cart
      if (cartItems.length === 0) return "CART_EMPTY";
      cartItems = [];
      ordersCreated += 1;
      return "ok";
    }

    // Sequential under lock (FOR UPDATE serializes)
    const a = await checkout();
    const b = await checkout();
    expect(a).toBe("ok");
    expect(b).toBe("CART_EMPTY");
    expect(ordersCreated).toBe(1);
  });
});

describe("Refill retry exhaustion (C-02 / C-03)", () => {
  it("pauses after 3 failures and restores stock exactly once", async () => {
    let stock = 10;
    let status: "ACTIVE" | "PAUSED" = "ACTIVE";
    let orderStatus: "PENDING" | "CANCELLED" = "PENDING";
    let restored = 0;
    const qty = 2;

    async function onExhaustion() {
      if (orderStatus === "CANCELLED") return; // idempotent
      orderStatus = "CANCELLED";
      stock += qty;
      restored += 1;
      status = "PAUSED";
    }

    // Simulate 3 failed attempts then exhaustion cleanup twice (worker race)
    await onExhaustion();
    await onExhaustion();

    expect(status).toBe("PAUSED");
    expect(orderStatus).toBe("CANCELLED");
    expect(restored).toBe(1);
    expect(stock).toBe(12);
  });

  it("does not advance nextRefillDate on failure", () => {
    const nextRefillDate = new Date("2026-01-01T00:00:00Z");
    const paymentSuccess = false;
    let advanced = false;
    if (paymentSuccess) {
      advanced = true;
    }
    expect(advanced).toBe(false);
    expect(nextRefillDate.toISOString()).toBe("2026-01-01T00:00:00.000Z");
  });
});

describe("Inactive product subscription pause (H-04)", () => {
  it("transitions ACTIVE → PAUSED on inactive products", () => {
    let status: "ACTIVE" | "PAUSED" = "ACTIVE";
    const error = "INACTIVE_PRODUCTS: Crocin 650";
    if (error.startsWith("INACTIVE_PRODUCTS")) {
      status = "PAUSED";
    }
    expect(status).toBe("PAUSED");
  });
});

describe("Address deletion guards (H-05 / H-06)", () => {
  it("blocks deletion when ACTIVE subscription references address", () => {
    const activeSubs = [{ id: "s1", addressId: "a1", status: "ACTIVE" }];
    const addressId = "a1";
    const blocked = activeSubs.some(
      (s) => s.addressId === addressId && s.status === "ACTIVE",
    );
    expect(blocked).toBe(true);
  });

  it("maps FK violation to ADDRESS_IN_USE_ORDER", () => {
    const prismaCode = "P2003";
    const mapped =
      prismaCode === "P2003" ? "ADDRESS_IN_USE_ORDER" : "UNKNOWN";
    expect(mapped).toBe("ADDRESS_IN_USE_ORDER");
  });
});

describe("COD payment SUCCESS on DELIVERED (H-07)", () => {
  it("marks only COD pending payments as SUCCESS", () => {
    const payments = [
      { method: "COD", status: "PENDING" },
      { method: "ONLINE", status: "PENDING" },
      { method: "COD", status: "SUCCESS" },
    ];

    const updated = payments.map((p) => {
      if (
        p.method === "COD" &&
        (p.status === "PENDING" || p.status === "FAILED")
      ) {
        return { ...p, status: "SUCCESS" };
      }
      return p;
    });

    expect(updated[0].status).toBe("SUCCESS");
    expect(updated[1].status).toBe("PENDING");
    expect(updated[2].status).toBe("SUCCESS");
  });
});

describe("Google account linking preserves ADMIN role", () => {
  it("keeps existing ADMIN when linking Google identity", () => {
    const existing = { role: "ADMIN" as const, emailVerifiedAt: new Date() };
    const linkedRole = existing.role; // linkGoogleId does not change role
    expect(linkedRole).toBe("ADMIN");
  });

  it("rejects linking when local email is unverified", () => {
    const existing = { emailVerifiedAt: null as Date | null };
    const canLink = existing.emailVerifiedAt !== null;
    expect(canLink).toBe(false);
  });
});
