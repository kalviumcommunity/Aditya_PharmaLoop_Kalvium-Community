import { NextResponse } from "next/server";

/**
 * GET /api/health
 *
 * Lightweight health probe used by Docker HEALTHCHECK and load balancers.
 * Does NOT query the database or expose any configuration or credentials.
 */
export function GET() {
  return NextResponse.json(
    { status: "ok", timestamp: new Date().toISOString() },
    { status: 200 }
  );
}
