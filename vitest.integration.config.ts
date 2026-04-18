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
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
    hookTimeout: 60_000,
    testTimeout: 30_000,
    passWithNoTests: true,
  },
});
