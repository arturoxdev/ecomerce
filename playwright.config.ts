import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import path from "node:path";

dotenv.config({ path: path.resolve(__dirname, ".env.local") });
dotenv.config({ path: path.resolve(__dirname, ".env") });

const ANON_SPECS = /admin-auth-guards\.spec\.ts|cart-validation-and-persistence\.spec\.ts/;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // T1, T2 and T13 mutate the single-row `settings` table (deliveryMode,
  // deliveryFee, depositPercent, themeId). They can't cross-worker serialize
  // in Playwright, so we run the whole suite on a single worker. The full
  // suite completes in <1 min, well within the 3 min PRD target.
  workers: 1,
  reporter: "html",
  globalTeardown: require.resolve("./e2e/fixtures/global-teardown.ts"),
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/admin.json",
      },
      dependencies: ["setup"],
      testIgnore: ANON_SPECS,
    },
    {
      name: "chromium-anon",
      use: {
        ...devices["Desktop Chrome"],
      },
      testMatch: ANON_SPECS,
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
