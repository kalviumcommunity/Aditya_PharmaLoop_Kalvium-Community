import bcrypt from "bcryptjs";
import { signToken } from "@/lib/auth";
import { userRepository } from "@/repositories/user.repository";
import { RegisterInput, LoginInput } from "@/types";

const SALT_ROUNDS = 12;

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
    const existingByGoogleId = await userRepository.findByGoogleId(googleUser.sub);
    if (existingByGoogleId) {
      const token = signToken(existingByGoogleId.id, existingByGoogleId.role);
      const { password, googleId, ...safeUser } = existingByGoogleId;
      void password;
      void googleId;
      return { user: safeUser, token, isNew: false };
    }

    // 2. Check if a local account exists with this verified email
    const existingByEmail = await userRepository.findByEmail(normalizedEmail);
    if (existingByEmail) {
      // Safe account linking: link only when local email is also verified
      if (existingByEmail.emailVerifiedAt === null) {
        throw new Error("LOCAL_EMAIL_NOT_VERIFIED");
      }

      // Preserve existing user ID, role (ADMIN stays ADMIN), password, and relations
      const updatedUser = await userRepository.linkGoogleId(
        existingByEmail.id,
        googleUser.sub
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
    const newUser = await userRepository.create({
      name: displayName,
      email: normalizedEmail,
      googleId: googleUser.sub,
      password: null,
      role: "CUSTOMER",
      emailVerifiedAt: new Date(),
    });

    const token = signToken(newUser.id, newUser.role);
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
