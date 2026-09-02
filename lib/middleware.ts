import { NextRequest } from "next/server";
import { verifyToken, AuthPayload } from "./auth";
import { unauthorized } from "./response";

export interface AuthenticatedRequest extends NextRequest {
  auth: AuthPayload;
}

type InnerHandler = (req: AuthenticatedRequest, ctx: unknown) => Promise<Response>;
type ExportedHandler = (req: NextRequest, ctx: unknown) => Promise<Response>;

/**
 * Higher-order function that wraps a Route Handler with JWT authentication.
 * Reads the token from:
 *  1. `Authorization: Bearer <token>` header
 *  2. `auth_token` cookie
 *
 * Attaches the decoded payload to `req.auth` and calls the inner handler.
 * Returns 401 if no valid token is found.
 */
export function withAuth(handler: InnerHandler): ExportedHandler {
  return (async (req: NextRequest, ctx: unknown) => {
    let token: string | null = null;

    // 1. Check Authorization header
    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.slice(7);
    }

    // 2. Fall back to cookie
    if (!token) {
      token = req.cookies.get("auth_token")?.value ?? null;
    }

    if (!token) {
      return unauthorized("Authentication required");
    }

    const payload = verifyToken(token);
    if (!payload) {
      return unauthorized("Invalid or expired token");
    }

    const authedReq = req as AuthenticatedRequest;
    authedReq.auth = payload;
    return handler(authedReq, ctx);
  }) as ExportedHandler;
}

/**
 * Guard for internal endpoints — checks for a shared secret in the
 * `x-internal-secret` header. Never expose internal routes to users.
 */
export function withInternalAuth(handler: InnerHandler): ExportedHandler {
  return (async (req: NextRequest, ctx: unknown) => {
    const secret = req.headers.get("x-internal-secret");
    const expected = process.env.INTERNAL_SECRET;

    if (!expected || secret !== expected) {
      return unauthorized("Internal access only");
    }

    const authedReq = req as AuthenticatedRequest;
    authedReq.auth = { userId: "system", role: "ADMIN" };
    return handler(authedReq, ctx);
  }) as ExportedHandler;
}
