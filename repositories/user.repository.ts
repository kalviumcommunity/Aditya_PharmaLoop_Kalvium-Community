import { prisma } from "@/lib/prisma";
import { UserRole } from "@/app/generated/prisma";

export interface CreateUserData {
  name: string;
  email: string;
  phone?: string;
  password?: string | null;
  googleId?: string | null;
  role?: UserRole;
  emailVerifiedAt?: Date | null;
}

export const userRepository = {
  async findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        googleId: true,
        role: true,
        emailVerifiedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  },

  async findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  },

  async findByGoogleId(googleId: string) {
    return prisma.user.findUnique({ where: { googleId } });
  },

  async linkGoogleId(userId: string, googleId: string, markVerified: boolean = false) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        googleId,
        ...(markVerified ? { emailVerifiedAt: new Date() } : {}),
      },
    });
  },

  async create(data: CreateUserData) {
    return prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        password: data.password ?? null,
        googleId: data.googleId ?? null,
        role: data.role ?? "CUSTOMER",
        emailVerifiedAt: data.emailVerifiedAt,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        googleId: true,
        role: true,
        emailVerifiedAt: true,
        createdAt: true,
      },
    });
  },

  async existsByEmail(email: string): Promise<boolean> {
    const count = await prisma.user.count({ where: { email } });
    return count > 0;
  },
};
