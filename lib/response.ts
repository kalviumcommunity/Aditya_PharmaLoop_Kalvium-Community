/**
 * Typed JSON response helpers.
 * All helpers return a standard `Response` object so they work
 * directly from Next.js Route Handlers.
 */

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

function json<T>(body: ApiResponse<T>, status: number): Response {
  return Response.json(body, { status });
}

export function ok<T>(data: T, message?: string): Response {
  return json({ success: true, data, message }, 200);
}

export function created<T>(data: T, message?: string): Response {
  return json({ success: true, data, message }, 201);
}

export function badRequest(error: string): Response {
  return json({ success: false, error }, 400);
}

export function unauthorized(error = "Unauthorized"): Response {
  return json({ success: false, error }, 401);
}

export function forbidden(error = "Forbidden"): Response {
  return json({ success: false, error }, 403);
}

export function notFound(error = "Not found"): Response {
  return json({ success: false, error }, 404);
}

export function conflict(error: string): Response {
  return json({ success: false, error }, 409);
}

export function serverError(error = "Internal server error"): Response {
  return json({ success: false, error }, 500);
}
