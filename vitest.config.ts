import { defineConfig } from "vitest/config";
import path from "path";

// Some pure-unit modules import the repository graph. Prisma does not connect
// during construction, so a syntactically valid test-only URL lets those units
// load without weakening the runtime's required-DATABASE_URL guard.
process.env.DATABASE_URL ??= "postgresql://test:test@127.0.0.1:5432/test";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    clearMocks: true,
  },
  resolve: {
    // Prisma 7's prisma-client generator exposes client.ts rather than an
    // index file. Mirror the Next/Turbopack alias so tests load it correctly.
    alias: [
      {
        find: "@/app/generated/prisma",
        replacement: path.resolve(__dirname, "app/generated/prisma/client.ts"),
      },
      { find: "@", replacement: path.resolve(__dirname, ".") },
    ],
  },
});
