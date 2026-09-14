import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

interface EdgeAuthPayload {
  userId: string;
  role: string;
  exp?: number;
  iat?: number;
}

const DEV_FALLBACK_SECRET =
  "pharmaloop-dev-jwt-secret-key-32-chars-minimum-2026";

function base64UrlToUint8Array(base64Url: string): Uint8Array {
  let base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) base64 += "=";
  const binStr = atob(base64);
  const bytes = new Uint8Array(binStr.length);
  for (let i = 0; i < binStr.length; i++) {
    bytes[i] = binStr.charCodeAt(i);
  }
  return bytes;
}

function decodeBase64UrlJson(base64Url: string): unknown {
  let base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) base64 += "=";
  return JSON.parse(atob(base64));
}

async function verifyTokenEdge(token: string): Promise<EdgeAuthPayload | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, sigB64] = parts;

    const payload = decodeBase64UrlJson(payloadB64) as EdgeAuthPayload;
    if (!payload || !payload.userId || !payload.role) return null;

    if (payload.exp && Date.now() >= payload.exp * 1000) return null;

    const secret =
      process.env.JWT_SECRET ||
      (process.env.NODE_ENV === "production" ? "" : DEV_FALLBACK_SECRET);
    if (!secret) return null;

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const sigBytes = base64UrlToUint8Array(sigB64);
    const data = encoder.encode(headerB64 + "." + payloadB64);

    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      sigBytes as unknown as BufferSource,
      data as unknown as BufferSource
    );
    return isValid ? payload : null;
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const token = request.cookies.get("auth_token")?.value;
  const { pathname } = request.nextUrl;

  const payload = token ? await verifyTokenEdge(token) : null;
  const hadExpiredOrInvalidToken = !!token && !payload;

  // 1. Root landing page (/)
  if (pathname === "/") {
    if (payload) {
      const target = payload.role === "ADMIN" ? "/admin" : "/dashboard";
      return NextResponse.redirect(new URL(target, request.url));
    }
    return NextResponse.next();
  }

  // 2. Pre-login auth routes (/login, /register)
  if (pathname === "/login" || pathname === "/register") {
    if (payload) {
      const redirectParam = request.nextUrl.searchParams.get("redirect");
      const safeRedirect =
        redirectParam &&
        redirectParam.startsWith("/") &&
        !redirectParam.startsWith("//") &&
        !redirectParam.startsWith("/login") &&
        !redirectParam.startsWith("/register")
          ? redirectParam
          : null;

      const target =
        safeRedirect ||
        (payload.role === "ADMIN" ? "/admin" : "/dashboard");
      return NextResponse.redirect(new URL(target, request.url));
    }
    if (hadExpiredOrInvalidToken) {
      const res = NextResponse.next();
      res.cookies.delete("auth_token");
      return res;
    }
    return NextResponse.next();
  }

  // 3. Admin routes (/admin, /admin/*)
  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");
  if (isAdminRoute) {
    if (!payload) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      const res = NextResponse.redirect(loginUrl);
      if (hadExpiredOrInvalidToken) res.cookies.delete("auth_token");
      return res;
    }
    if (payload.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  // 4. Protected customer routes
  const protectedCustomerRoutes = [
    "/dashboard",
    "/subscriptions",
    "/orders",
    "/cart",
    "/checkout",
    "/notifications",
    "/address-book",
    "/payments",
  ];

  const isCustomerRoute = protectedCustomerRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );

  if (isCustomerRoute) {
    if (!payload) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      const res = NextResponse.redirect(loginUrl);
      if (hadExpiredOrInvalidToken) res.cookies.delete("auth_token");
      return res;
    }
    if (payload.role === "ADMIN") {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/register",
    "/dashboard/:path*",
    "/subscriptions/:path*",
    "/orders/:path*",
    "/cart/:path*",
    "/checkout/:path*",
    "/notifications/:path*",
    "/address-book/:path*",
    "/payments/:path*",
    "/admin/:path*",
  ],
};
