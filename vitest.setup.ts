import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Neutralize `import "server-only"` in the jsdom environment. Next.js uses
// this sentinel package to fence off server-only modules, but during unit
// tests we intentionally import them (with env mocked) and do not want the
// package's runtime throw to abort module loading.
vi.mock("server-only", () => ({}));

// Provide safe defaults for env vars so that importing server modules
// (lib/env, lib/db, lib/config/tenant, lib/services/s3-client) from unit
// tests does not crash. Real values are expected only in integration tests.
process.env.DATABASE_URL ??= "postgres://test:test@localhost:5432/test";
process.env.STORE_ID ??= "test-store";
process.env.S3_ENDPOINT ??= "https://s3.test.local";
process.env.S3_REGION ??= "us-east-1";
process.env.S3_ACCESS_KEY_ID ??= "test";
process.env.S3_SECRET_ACCESS_KEY ??= "test";
process.env.S3_BUCKET ??= "test-bucket";
process.env.S3_PUBLIC_URL ??= "https://cdn.test.local";
