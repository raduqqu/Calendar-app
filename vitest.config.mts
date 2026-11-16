import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const fromRoot = (path: string) =>
  fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
  resolve: {
    alias: {
      // "server-only" is a Next.js marker that stops server code from being
      // bundled for the browser. Tests do not need it.
      "server-only": fromRoot("./tests/stubs/server-only.ts"),
      "@": fromRoot("."),
    },
  },
});
