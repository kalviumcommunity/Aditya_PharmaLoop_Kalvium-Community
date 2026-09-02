import { prisma } from "@/lib/prisma";
import { UserRole } from "@/app/generated/prisma";

export interface CreateUserData {
  name: string;
  email: string;
  phone?: string;
  password: string;
  role?: UserRole;
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
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  },

  async findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  },

  async create(data: CreateUserData) {
    return prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        password: data.password,
        role: data.role ?? "CUSTOMER",
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
      },
    });
  },

  async existsByEmail(email: string): Promise<boolean> {
    const count = await prisma.user.count({ where: { email } });
    return count > 0;
  },
};
