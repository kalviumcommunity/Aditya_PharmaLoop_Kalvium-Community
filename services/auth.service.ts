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

    const valid = await bcrypt.compare(input.password, user.password);
    if (!valid) {
      throw new Error("INVALID_CREDENTIALS");
    }

    // Strip password from returned user object
    const { password, ...safeUser } = user;
    void password;

    const token = signToken(user.id, user.role);
    return { user: safeUser, token };
  },

  async getMe(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user) throw new Error("USER_NOT_FOUND");
    return user;
  },
};
