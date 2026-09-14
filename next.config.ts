import type { NextConfig } from "next";

/**
 * Prisma 7's `prisma-client` generator no longer emits `index.ts`.
 * The canonical entrypoint is `client.ts`. Map the existing import alias
 * so Turbopack resolves `@/app/generated/prisma` → `client.ts`
 * without rewriting every application import.
 */
const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["@prisma/client", "pg"],
  turbopack: {
    resolveAlias: {
      "@/app/generated/prisma": "./app/generated/prisma/client.ts",
    },
  },
};

export default nextConfig;
