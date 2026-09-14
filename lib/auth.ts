import jwt from "jsonwebtoken";

const JWT_EXPIRES_IN =
  (process.env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"]) ?? "7d";
const DEV_FALLBACK_SECRET =
  "pharmaloop-dev-jwt-secret-key-32-chars-minimum-2026";

function getJwtSecret(): string {
  const secret =
    process.env.JWT_SECRET ||
    (process.env.NODE_ENV === "production" ? undefined : DEV_FALLBACK_SECRET);
  if (!secret) throw new Error("JWT_SECRET is required in production environment");
  return secret;
}

export interface AuthPayload {
  userId: string;
  role: string;
  iat?: number;
  exp?: number;
}

/**
 * Sign a JWT containing the user's id and role.
 */
export function signToken(userId: string, role: string): string {
  return jwt.sign({ userId, role }, getJwtSecret(), {
    expiresIn: JWT_EXPIRES_IN,
  });
}

/**
 * Verify and decode a JWT. Returns null when the token is invalid or expired.
 */
export function verifyToken(token: string): AuthPayload | null {
  try {
    return jwt.verify(token, getJwtSecret()) as AuthPayload;
  } catch {
    return null;
  }
}
