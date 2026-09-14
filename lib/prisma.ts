import { PrismaClient } from "@/app/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Some container launch paths preserve shell-style quotes around environment
 * values. A quoted DATABASE_URL like `"postgresql://..."` is not a valid URL
 * for `pg`; normalize the boundary before creating the pool.
 */
function normalizeConnectionString(raw: string | undefined): string | undefined {
  if (raw === undefined) return undefined;
  const trimmed = raw.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function createPrismaClient() {
  const connectionString = normalizeConnectionString(process.env.DATABASE_URL);
  if (!connectionString) {
    throw new Error("DATABASE_URL is required to initialize Prisma");
  }

  const poolMax = Number(process.env.PG_POOL_MAX ?? "10");
  const pool = new Pool({
    connectionString,
    max: Number.isFinite(poolMax) && poolMax > 0 ? poolMax : 10,
    // Supabase connections must not silently fall back to plaintext in production.
    ssl:
      process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : undefined,
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

function getPrismaClient(): PrismaClient {
  if (
    globalForPrisma.prisma &&
    "orderFeedback" in (globalForPrisma.prisma as unknown as Record<string, unknown>)
  ) {
    const runtimeFields = (
      globalForPrisma.prisma as unknown as {
        _runtimeDataModel?: {
          models?: { User?: { fields?: Array<{ name: string }> } };
        };
      }
    )._runtimeDataModel?.models?.User?.fields;

    const hasGoogleId =
      !runtimeFields || runtimeFields.some((f) => f.name === "googleId");

    if (hasGoogleId) {
      return globalForPrisma.prisma;
    }
  }
  const client = createPrismaClient();
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
  }
  return client;
}

export const prisma = getPrismaClient();
