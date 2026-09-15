import bcrypt from "bcryptjs";
import { signToken } from "@/lib/auth";
import { userRepository } from "@/repositories/user.repository";
import { RegisterInput, LoginInput } from "@/types";
import { Prisma } from "@/app/generated/prisma";
import { sendWelcomeEmail } from "@/services/emailService";

const SALT_ROUNDS = 12;

export type GoogleOAuthPrismaOperation =
  | "user.findUnique.googleId"
  | "user.findUnique.email"
  | "user.update.linkGoogleId"
  | "user.create.googleUser";

export class GoogleOAuthPrismaError extends Error {
  readonly code: string;
  readonly operation: GoogleOAuthPrismaOperation;
  readonly modelName: string | null;
  readonly target: string | null;
  readonly column: string | null;

  constructor(operation: GoogleOAuthPrismaOperation, cause: Prisma.PrismaClientKnownRequestError) {
    super("GOOGLE_OAUTH_PRISMA_ERROR", { cause });
    this.name = "GoogleOAuthPrismaError";
    this.operation = operation;
    this.code = cause.code;

    // Keep only schema/query-shape metadata. Message text and arbitrary metadata
    // can contain user input, so neither is preserved for production logging.
    const meta = cause.meta as {
      modelName?: unknown;
      target?: unknown;
      column?: unknown;
    } | undefined;
    this.modelName = typeof meta?.modelName === "string" ? meta.modelName : null;
    this.target = Array.isArray(meta?.target)
      ? meta.target.filter((item): item is string => typeof item === "string").join(",")
      : typeof meta?.target === "string"
        ? meta.target
        : null;
    this.column = typeof meta?.column === "string" ? meta.column : null;
  }
}

async function runGoogleOAuthPrismaOperation<T>(
  operation: GoogleOAuthPrismaOperation,
  query: () => Promise<T>,
): Promise<T> {
  try {
    return await query();
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      throw new GoogleOAuthPrismaError(operation, error);
    }
    throw error;
  }
}

export const authService = {
  async register(input: RegisterInput) {
    const exists = await userRepository.existsByEmail(input.email);
    if (exists) {
      throw new Error("EMAIL_TAKEN");
    }

    const hashedPassword = await bcrypt.hash(input.password, SALT_ROUNDS);
    const user = await userRepository.create({
      ...input,
      password: hashedPassword,
    });

    const token = signToken(user.id, user.role);
    return { user, token };
  },

  async login(input: LoginInput) {
    const user = await userRepository.findByEmail(input.email);
    if (!user) {
      throw new Error("INVALID_CREDENTIALS");
    }

    if (!user.password) {
      throw new Error("GOOGLE_ACCOUNT_NO_PASSWORD");
    }

    const valid = await bcrypt.compare(input.password, user.password);
    if (!valid) {
      throw new Error("INVALID_CREDENTIALS");
    }

    if (user.emailVerifiedAt === null) {
      throw new Error("EMAIL_NOT_VERIFIED");
    }

    // Strip password and internal identifiers from returned user object
    const { password, googleId, ...safeUser } = user;
    void password;
    void googleId;

    const token = signToken(user.id, user.role);
    return { user: safeUser, token };
  },

  async handleGoogleIdentity(googleUser: {
    sub: string;
    email: string;
    name?: string;
    emailVerified: boolean;
  }) {
    if (!googleUser.sub) {
      throw new Error("INVALID_GOOGLE_IDENTITY");
    }

    if (!googleUser.email || !googleUser.emailVerified) {
      throw new Error("UNVERIFIED_GOOGLE_EMAIL");
    }

    const normalizedEmail = googleUser.email.trim().toLowerCase();

    // 1. Check if user already exists with this googleId
    const existingByGoogleId = await runGoogleOAuthPrismaOperation(
      "user.findUnique.googleId",
      () => userRepository.findByGoogleId(googleUser.sub),
    );
    if (existingByGoogleId) {
      const token = signToken(existingByGoogleId.id, existingByGoogleId.role);
      const { password, googleId, ...safeUser } = existingByGoogleId;
      void password;
      void googleId;
      return { user: safeUser, token, isNew: false };
    }

    // 2. Check if a local account exists with this verified email
    const existingByEmail = await runGoogleOAuthPrismaOperation(
      "user.findUnique.email",
      () => userRepository.findByEmail(normalizedEmail),
    );
    if (existingByEmail) {
      // Safe account linking: link only when local email is also verified
      if (existingByEmail.emailVerifiedAt === null) {
        throw new Error("LOCAL_EMAIL_NOT_VERIFIED");
      }

      // Preserve existing user ID, role (ADMIN stays ADMIN), password, and relations
      const updatedUser = await runGoogleOAuthPrismaOperation(
        "user.update.linkGoogleId",
        () => userRepository.linkGoogleId(
          existingByEmail.id,
          googleUser.sub,
        ),
      );

      const token = signToken(updatedUser.id, updatedUser.role);
      const { password, googleId, ...safeUser } = updatedUser;
      void password;
      void googleId;
      return { user: safeUser, token, isNew: false };
    }

    // 3. New User Registration via Google OAuth
    // STRICT RULE: New Google accounts can NEVER become ADMIN
    const displayName = googleUser.name?.trim() || normalizedEmail.split("@")[0];
    const newUser = await runGoogleOAuthPrismaOperation(
      "user.create.googleUser",
      () => userRepository.create({
        name: displayName,
        email: normalizedEmail,
        googleId: googleUser.sub,
        password: null,
        role: "CUSTOMER",
        emailVerifiedAt: new Date(),
      }),
    );

    const token = signToken(newUser.id, newUser.role);

    // Non-blocking welcome email side effect
    sendWelcomeEmail({
      to: newUser.email,
      name: newUser.name,
    }).catch((err) => {
      console.warn("[AuthService] Welcome email dispatch warning for Google user:", err);
    });

    const { googleId, ...safeNewUser } = newUser;
    void googleId;
    return { user: safeNewUser, token, isNew: true };
  },

  async getMe(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user) throw new Error("USER_NOT_FOUND");
    const { googleId: _googleId, ...safeUser } = user;
    void _googleId;
    return safeUser;
  },
};
