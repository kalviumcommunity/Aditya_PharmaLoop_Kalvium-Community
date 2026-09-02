import { ok } from "@/lib/response";

export async function POST() {
  const response = ok(null, "Logged out successfully");
  response.headers.set(
    "Set-Cookie",
    "auth_token=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict"
  );
  return response;
}
