import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const token = request.cookies.get("auth_token")?.value;
  const { pathname } = request.nextUrl;

  const protectedRoutes = [
    "/dashboard",
    "/subscriptions",
    "/orders",
    "/cart",
    "/checkout",
    "/notifications",
    "/address-book",
    "/admin",
  ];

  const isProtected = protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );

  if (isProtected && !token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/subscriptions/:path*",
    "/orders/:path*",
    "/cart/:path*",
    "/checkout/:path*",
    "/notifications/:path*",
    "/address-book/:path*",
    "/admin/:path*",
  ],
};
