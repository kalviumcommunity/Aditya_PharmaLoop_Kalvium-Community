import { NextRequest, NextResponse } from "next/server";
import {
  isGoogleOAuthConfigured,
  generateGoogleAuthUrl,
  createOAuthState,
  getPublicAppRedirectUrl,
  sanitizeInternalRedirect,
  STATE_COOKIE_NAME,
  STATE_MAX_AGE_SECONDS,
} from "@/lib/google-auth";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const rawRedirect = searchParams.get("redirect");
  const targetRedirect = sanitizeInternalRedirect(rawRedirect);

  // Check if Google OAuth is configured
  if (!isGoogleOAuthConfigured()) {
    const errorUrl = getPublicAppRedirectUrl("/login");
    errorUrl.searchParams.set("error", "google_not_configured");
    if (targetRedirect !== "/dashboard") {
      errorUrl.searchParams.set("redirect", targetRedirect);
    }
    return NextResponse.redirect(errorUrl);
  }

  const existingStateCookie =
    req.cookies.get(STATE_COOKIE_NAME)?.value ||
    req.cookies.get("g_oauth_state")?.value;
  const { state, serializedCookie } = createOAuthState(existingStateCookie, targetRedirect);

  const googleUrl = generateGoogleAuthUrl(state);

  const response = NextResponse.redirect(googleUrl);
  // Set multi-tab map cookie
  response.cookies.set({
    name: STATE_COOKIE_NAME,
    value: serializedCookie,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: STATE_MAX_AGE_SECONDS,
  });
  // Also set singular g_oauth_state for legacy/direct single-state clients
  response.cookies.set({
    name: "g_oauth_state",
    value: state,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: STATE_MAX_AGE_SECONDS,
  });

  return response;
}
