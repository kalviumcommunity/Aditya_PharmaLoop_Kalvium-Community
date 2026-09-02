import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret-change-me";
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"]) ?? "7d";

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
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Verify and decode a JWT. Returns null when the token is invalid or expired.
 */
export function verifyToken(token: string): AuthPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthPayload;
  } catch {
    return null;
  }
}
