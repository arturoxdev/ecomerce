import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    globals: false,
    include: ["**/*.integration.test.ts", "tests/integration/**/*.{test,spec}.ts"],
    exclude: ["node_modules/**", ".next/**", "dist/**"],
    globalSetup: ["./tests/integration/global-setup.ts"],
    setupFiles: ["./tests/integration/setup.ts"],
    // Keep integration tests serial so the `beforeEach` TRUNCATE does not
    // race between parallel workers against the same DB.
    fileParallelism: false,
    hookTimeout: 60_000,
    testTimeout: 30_000,
    passWithNoTests: true,
  },
});
