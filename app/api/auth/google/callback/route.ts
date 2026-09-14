import { NextRequest, NextResponse } from "next/server";
import {
  consumeOAuthState,
  verifyGoogleAuthCode,
  isGoogleOAuthConfigured,
  STATE_COOKIE_NAME,
} from "@/lib/google-auth";
import { authService } from "@/services/auth.service";

function logOAuthDiagnostic(
  event: string,
  details?: Record<string, string | number | boolean | null>,
) {
  // Keep Render logs useful without persisting OAuth data or logging identities,
  // authorization codes, tokens, or provider response bodies.
  console.info("[Google OAuth]", event, details);
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  logOAuthDiagnostic("Callback Invoked", {
    hasCode: Boolean(code),
    hasState: Boolean(state),
    oauthError: oauthError || null,
  });

  // Handle Google OAuth cancellation or error
  if (oauthError) {
    logOAuthDiagnostic("OAuth Error from Google", { oauthError });
    const errorUrl = new URL("/login", req.url);
    if (oauthError === "access_denied") {
      errorUrl.searchParams.set("error", "oauth_cancelled");
    } else {
      errorUrl.searchParams.set("error", "oauth_failed");
    }
    return NextResponse.redirect(errorUrl);
  }

  // Validate state and code presence
  if (!code || !state) {
    logOAuthDiagnostic("Missing parameters", { hasCode: Boolean(code), hasState: Boolean(state) });
    const errorUrl = new URL("/login", req.url);
    errorUrl.searchParams.set("error", "missing_parameters");
    return NextResponse.redirect(errorUrl);
  }

  // Validate and consume multi-tab state (Check both plural and singular names)
  const existingCookieHeader =
    req.cookies.get(STATE_COOKIE_NAME)?.value ||
    req.cookies.get("g_oauth_state")?.value;

  const { valid, redirect: targetRedirect, updatedCookie } = consumeOAuthState(
    existingCookieHeader,
    state
  );

  if (!valid) {
    logOAuthDiagnostic("State Validation Failed", {
      hasCookie: Boolean(existingCookieHeader),
      stateMatches: false,
    });
    const errorUrl = new URL("/login", req.url);
    errorUrl.searchParams.set("error", "invalid_state");
    const res = NextResponse.redirect(errorUrl);
    res.cookies.delete(STATE_COOKIE_NAME);
    res.cookies.delete("g_oauth_state");
    return res;
  }

  // Check if configured
  if (!isGoogleOAuthConfigured()) {
    logOAuthDiagnostic("Google OAuth Not Configured");
    const errorUrl = new URL("/login", req.url);
    errorUrl.searchParams.set("error", "google_not_configured");
    return NextResponse.redirect(errorUrl);
  }

  try {
    logOAuthDiagnostic("Exchanging authorization code...");
    // Verify token with Google (enforcing signature, audience, issuer, exp, sub)
    const verifiedGoogleUser = await verifyGoogleAuthCode(code);

    logOAuthDiagnostic("Google Identity Verified", {
      verified: verifiedGoogleUser.emailVerified,
    });

    // Domain resolution: find user, link safely, or create CUSTOMER
    const { user, token } = await authService.handleGoogleIdentity(verifiedGoogleUser);

    logOAuthDiagnostic("User Identity Resolved", {
      role: user.role,
    });

    // Determine final redirect destination
    // Rule: ADMIN -> /admin; CUSTOMER -> targetRedirect (or /dashboard)
    const finalDestination =
      user.role === "ADMIN"
        ? "/admin"
        : targetRedirect && targetRedirect !== "/login" && targetRedirect !== "/register"
        ? targetRedirect
        : "/dashboard";

    const response = NextResponse.redirect(new URL(finalDestination, req.url));

    // Set existing HttpOnly auth_token cookie
    response.cookies.set({
      name: "auth_token",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    // Update or clear multi-tab state cookie
    if (updatedCookie) {
      response.cookies.set({
        name: STATE_COOKIE_NAME,
        value: updatedCookie,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 600,
      });
    } else {
      response.cookies.delete(STATE_COOKIE_NAME);
      response.cookies.delete("g_oauth_state");
    }

    logOAuthDiagnostic("Authentication Successful", { destination: finalDestination });
    return response;
  } catch (err: unknown) {
    const gaxiosErr = err as {
      response?: { status?: number; data?: unknown };
      message?: string;
      name?: string;
    };
    logOAuthDiagnostic("Callback Exception Caught", {
      errorName: gaxiosErr?.name ?? null,
      httpStatus: gaxiosErr?.response?.status ?? null,
    });

    console.error("[Google OAuth Callback Error] callback failed");
    const errorUrl = new URL("/login", req.url);

    if (err instanceof Error && err.message === "UNVERIFIED_GOOGLE_EMAIL") {
      errorUrl.searchParams.set("error", "unverified_google_email");
    } else if (err instanceof Error && err.message === "LOCAL_EMAIL_NOT_VERIFIED") {
      errorUrl.searchParams.set("error", "local_email_not_verified");
    } else {
      errorUrl.searchParams.set("error", "auth_failed");
    }

    const res = NextResponse.redirect(errorUrl);
    if (updatedCookie) {
      res.cookies.set({
        name: STATE_COOKIE_NAME,
        value: updatedCookie,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 600,
      });
    } else {
      res.cookies.delete(STATE_COOKIE_NAME);
      res.cookies.delete("g_oauth_state");
    }
    return res;
  }
}
