import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    // Default environment stays "node" for the existing `.ts` suite.
    // Component tests (tests/**/*.test.tsx) opt into a DOM environment via
    // a per-file `// @vitest-environment jsdom` docblock instead of a glob
    // config (Vitest 4 removed `environmentMatchGlobs` — the docblock
    // mechanism is the current per-file override path). SPEC-GAME-CORE-001
    // §F M10.
    environment: "node",
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    setupFiles: ["./vitest.setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["types/**/*.ts", "lib/**/*.ts", "components/**/*.tsx"],
    },
  },
});
