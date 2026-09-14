import crypto from "crypto";
import { OAuth2Client } from "google-auth-library";

export const STATE_COOKIE_NAME = "g_oauth_states";
export const STATE_MAX_AGE_SECONDS = 600; // 10 minutes
export const MAX_ACTIVE_STATES = 5;

export interface OAuthStateEntry {
  redirect: string;
  createdAt: number;
}

export type OAuthStateMap = Record<string, OAuthStateEntry>;

export interface VerifiedGoogleUser {
  sub: string;
  email: string;
  name?: string;
  emailVerified: boolean;
}

/**
 * Returns true if Google OAuth credentials are set in environment variables.
 */
export function isGoogleOAuthConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID?.trim() &&
    process.env.GOOGLE_CLIENT_SECRET?.trim()
  );
}

/**
 * Derives the canonical Google OAuth callback URI.
 * Uses exact http://localhost:3000/api/auth/google/callback in development,
 * or GOOGLE_REDIRECT_URI / NEXT_PUBLIC_APP_URL in production.
 */
export function getGoogleRedirectUri(): string {
  if (process.env.GOOGLE_REDIRECT_URI) {
    return process.env.GOOGLE_REDIRECT_URI;
  }
  if (process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_APP_URL) {
    return `${process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/api/auth/google/callback`;
  }
  return "http://localhost:3000/api/auth/google/callback";
}

/**
 * Sanitizes internal redirect URLs to prevent open-redirect vulnerabilities.
 * Only relative internal paths (starting with '/' but not '//' or '/\\') are permitted.
 */
export function sanitizeInternalRedirect(redirect: string | null | undefined): string {
  if (!redirect) return "/dashboard";
  const trimmed = redirect.trim();
  if (
    trimmed.startsWith("/") &&
    !trimmed.startsWith("//") &&
    !trimmed.startsWith("/\\") &&
    !trimmed.includes(":")
  ) {
    return trimmed;
  }
  return "/dashboard";
}

/**
 * Creates a Google OAuth2Client instance using environment credentials.
 */
export function createOAuth2Client(redirectUri = getGoogleRedirectUri()): OAuth2Client {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  return new OAuth2Client({
    clientId,
    clientSecret,
    redirectUri,
  });
}

/**
 * Safely parses cookie value into an OAuthStateMap, handling URL-encoding,
 * JSON parsing, and legacy single-token strings.
 */
export function parseStateMap(existingCookieHeader: string | null | undefined): OAuthStateMap {
  if (!existingCookieHeader) return {};
  try {
    let raw = existingCookieHeader.trim();
    if (raw.startsWith("%7B") || raw.startsWith("%7b")) {
      try {
        raw = decodeURIComponent(raw);
      } catch {
        // use raw
      }
    }
    const parsed = JSON.parse(raw);
    if (typeof parsed === "object" && parsed !== null) {
      return parsed as OAuthStateMap;
    }
    return {};
  } catch {
    // If it's not JSON, check if it's a plain hex/alphanumeric state token (e.g. single-state format)
    const trimmed = existingCookieHeader.trim();
    if (trimmed.length >= 16 && !trimmed.includes("{") && !trimmed.includes("\"")) {
      return {
        [trimmed]: {
          redirect: "/dashboard",
          createdAt: Date.now(),
        },
      };
    }
    return {};
  }
}

/**
 * Generates the Google OAuth authorization URL with required minimal scopes.
 */
export function generateGoogleAuthUrl(state: string, redirectUri = getGoogleRedirectUri()): string {
  const client = createOAuth2Client(redirectUri);
  return client.generateAuthUrl({
    access_type: "online",
    scope: ["openid", "email", "profile"],
    state,
    prompt: "select_account",
  });
}

/**
 * Multi-Tab State Handling (Correction #3):
 * Adds a new cryptographically random state to the multi-tab state map,
 * purging stale states older than 10 minutes and keeping at most 5 entries.
 */
export function createOAuthState(
  existingCookieHeader: string | null | undefined,
  targetRedirect: string
): { state: string; serializedCookie: string } {
  const state = crypto.randomBytes(32).toString("hex");
  const now = Date.now();
  const stateMap = parseStateMap(existingCookieHeader);

  // Purge expired states
  for (const [key, entry] of Object.entries(stateMap)) {
    if (!entry?.createdAt || now - entry.createdAt >= STATE_MAX_AGE_SECONDS * 1000) {
      delete stateMap[key];
    }
  }

  const entries = Object.entries(stateMap).sort((a, b) => b[1].createdAt - a[1].createdAt);
  if (entries.length >= MAX_ACTIVE_STATES) {
    const retained = entries.slice(0, MAX_ACTIVE_STATES - 1);
    for (const key of Object.keys(stateMap)) {
      if (!retained.some(([k]) => k === key)) {
        delete stateMap[key];
      }
    }
  }

  stateMap[state] = {
    redirect: sanitizeInternalRedirect(targetRedirect),
    createdAt: now,
  };

  return {
    state,
    serializedCookie: JSON.stringify(stateMap),
  };
}

/**
 * Validates and consumes an OAuth state (one-time use).
 * Returns the stored redirect and updated cookie value.
 */
export function consumeOAuthState(
  existingCookieHeader: string | null | undefined,
  incomingState: string | null | undefined
): { valid: boolean; redirect: string; updatedCookie: string | null } {
  if (!incomingState || !existingCookieHeader) {
    return { valid: false, redirect: "/dashboard", updatedCookie: null };
  }

  try {
    const stateMap = parseStateMap(existingCookieHeader);
    const entry = stateMap[incomingState];
    const now = Date.now();

    if (!entry || !entry.createdAt || now - entry.createdAt >= STATE_MAX_AGE_SECONDS * 1000) {
      return { valid: false, redirect: "/dashboard", updatedCookie: null };
    }

    const redirect = entry.redirect;
    delete stateMap[incomingState];

    const remainingKeys = Object.keys(stateMap);
    return {
      valid: true,
      redirect,
      updatedCookie: remainingKeys.length > 0 ? JSON.stringify(stateMap) : null,
    };
  } catch {
    return { valid: false, redirect: "/dashboard", updatedCookie: null };
  }
}

/**
 * Exchanges the OAuth authorization code and verifies the Google ID Token.
 * Enforces signature, issuer, audience, and expiration checks.
 */
export async function verifyGoogleAuthCode(
  code: string,
  redirectUri = getGoogleRedirectUri()
): Promise<VerifiedGoogleUser> {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  if (!clientId) {
    throw new Error("GOOGLE_CLIENT_ID_MISSING");
  }

  const client = createOAuth2Client(redirectUri);

  let tokens;
  try {
    const tokenResponse = await client.getToken({
      code,
      redirect_uri: redirectUri,
    });
    tokens = tokenResponse.tokens;
  } catch (tokenErr: unknown) {
    const gaxiosErr = tokenErr as { response?: { status?: number }; name?: string };
    console.error("[Google Token Exchange Failed]", {
      name: gaxiosErr?.name,
      status: gaxiosErr?.response?.status,
    });
    throw tokenErr;
  }

  if (!tokens.id_token) {
    throw new Error("GOOGLE_ID_TOKEN_MISSING");
  }

  const ticket = await client.verifyIdToken({
    idToken: tokens.id_token,
    audience: clientId,
  });

  const payload = ticket.getPayload();
  if (!payload || !payload.sub) {
    throw new Error("INVALID_GOOGLE_TOKEN_PAYLOAD");
  }

  if (!payload.email) {
    throw new Error("GOOGLE_EMAIL_MISSING");
  }

  return {
    sub: payload.sub,
    email: payload.email,
    name: payload.name || undefined,
    emailVerified: Boolean(payload.email_verified),
  };
}
