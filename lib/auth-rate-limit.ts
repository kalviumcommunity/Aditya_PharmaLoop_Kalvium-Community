/**
 * Login Rate Limiting & Brute-Force Protection
 *
 * Provides in-memory sliding window rate limiting for authentication attempts
 * keyed by client IP and normalized email address.
 *
 * NOTE FOR PRODUCTION / MULTI-INSTANCE (GCP Cloud Run):
 * In a multi-instance containerized environment, each instance maintains its
 * own memory space. For strictly distributed rate-limiting across scaled instances,
 * replace or back this store with a shared Redis instance (e.g. Upstash / GCP Memorystore).
 * This implementation provides robust per-instance brute-force protection without
 * external dependencies and gracefully resets on restart.
 */

interface AttemptRecord {
  count: number;
  firstAttempt: number;
  lockedUntil?: number;
}

const MAX_ATTEMPTS_PER_WINDOW = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes window
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes lockout

const ipAttempts = new Map<string, AttemptRecord>();
const emailAttempts = new Map<string, AttemptRecord>();

// Periodic cleanup every 10 minutes to prevent memory leak
if (typeof setInterval !== "undefined") {
  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of ipAttempts.entries()) {
      if (now - record.firstAttempt > WINDOW_MS && (!record.lockedUntil || now > record.lockedUntil)) {
        ipAttempts.delete(key);
      }
    }
    for (const [key, record] of emailAttempts.entries()) {
      if (now - record.firstAttempt > WINDOW_MS && (!record.lockedUntil || now > record.lockedUntil)) {
        emailAttempts.delete(key);
      }
    }
  }, 10 * 60 * 1000);

  if (typeof cleanupTimer.unref === "function") {
    cleanupTimer.unref();
  }
}

function checkStore(store: Map<string, AttemptRecord>, key: string): { isLocked: boolean; remainingSeconds: number } {
  const now = Date.now();
  const record = store.get(key);
  if (!record) {
    return { isLocked: false, remainingSeconds: 0 };
  }

  if (record.lockedUntil && now < record.lockedUntil) {
    const remainingSeconds = Math.ceil((record.lockedUntil - now) / 1000);
    return { isLocked: true, remainingSeconds };
  }

  if (now - record.firstAttempt > WINDOW_MS) {
    store.delete(key);
    return { isLocked: false, remainingSeconds: 0 };
  }

  return { isLocked: false, remainingSeconds: 0 };
}

function recordFailure(store: Map<string, AttemptRecord>, key: string) {
  const now = Date.now();
  const record = store.get(key);
  if (!record || now - record.firstAttempt > WINDOW_MS) {
    store.set(key, { count: 1, firstAttempt: now });
    return;
  }

  record.count += 1;
  if (record.count >= MAX_ATTEMPTS_PER_WINDOW) {
    record.lockedUntil = now + LOCKOUT_MS;
  }
}

function recordSuccess(store: Map<string, AttemptRecord>, key: string) {
  store.delete(key);
}

export const loginRateLimiter = {
  check(ip: string, email: string): { allowed: boolean; retryAfterSeconds: number } {
    const normalizedEmail = email.toLowerCase().trim();
    const ipCheck = checkStore(ipAttempts, ip);
    if (ipCheck.isLocked) {
      return { allowed: false, retryAfterSeconds: ipCheck.remainingSeconds };
    }

    const emailCheck = checkStore(emailAttempts, normalizedEmail);
    if (emailCheck.isLocked) {
      return { allowed: false, retryAfterSeconds: emailCheck.remainingSeconds };
    }

    return { allowed: true, retryAfterSeconds: 0 };
  },

  onFailedAttempt(ip: string, email: string) {
    const normalizedEmail = email.toLowerCase().trim();
    recordFailure(ipAttempts, ip);
    recordFailure(emailAttempts, normalizedEmail);
  },

  onSuccessfulLogin(ip: string, email: string) {
    const normalizedEmail = email.toLowerCase().trim();
    recordSuccess(ipAttempts, ip);
    recordSuccess(emailAttempts, normalizedEmail);
  },

  reset() {
    ipAttempts.clear();
    emailAttempts.clear();
  },
};
