import path from "node:path";
import { beforeEach, vi } from "vitest";
import dotenv from "dotenv";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import { Pool } from "pg";

import { sanitizePostgresUrl } from "./sanitize-url";

// Neutralize `import "server-only"` in the Node test environment. Integration
// tests intentionally import server modules (services, route handlers); the
// sentinel package would otherwise throw at module load.
vi.mock("server-only", () => ({}));

// NextAuth's entry pulls `next/server`, which does not resolve cleanly
// outside a Next.js runtime. Integration tests exercise DB/service
// transactional behavior, not auth, so stub `@/auth` and the permission
// helpers. Any test that needs to exercise auth directly should override
// these mocks locally.
vi.mock("@/auth", () => ({
  auth: async () => ({
    user: { id: "test-user", role: "ROOT", name: "Test", email: "test@test" },
  }),
  signIn: async () => undefined,
  signOut: async () => undefined,
  handlers: { GET: async () => new Response(), POST: async () => new Response() },
}));

vi.mock("@/lib/services/auth", () => {
  type UserRole = "ROOT" | "ADMIN" | "EMPLOYEE";
  const ROLE_LEVEL: Record<UserRole, number> = {
    ROOT: 3,
    ADMIN: 2,
    EMPLOYEE: 1,
  };
  const stubUser = () => ({
    id: "test-user",
    storeId: process.env.STORE_ID ?? "test-store",
    name: "Test",
    email: "test@test",
    role: "ROOT" as UserRole,
  });

  return {
    getSessionUser: async () => stubUser(),
    requireWriteAccess: async () => stubUser(),
    canWriteData: (role: UserRole) => role !== "EMPLOYEE",
    canCreateRole: (current: UserRole, target: UserRole) => {
      if (current === "EMPLOYEE") return false;
      if (current === "ADMIN") return target === "EMPLOYEE";
      return target === "ADMIN" || target === "EMPLOYEE";
    },
    canEditUser: (current: UserRole, target: UserRole) =>
      ROLE_LEVEL[current] > ROLE_LEVEL[target],
    getAssignableRoles: (current: UserRole): UserRole[] => {
      if (current === "ROOT") return ["ADMIN", "EMPLOYEE"];
      if (current === "ADMIN") return ["EMPLOYEE"];
      return [];
    },
  };
});

dotenv.config({
  path: path.resolve(process.cwd(), ".env.test.local"),
  quiet: true,
});

const rawUrl = process.env.TEST_DATABASE_URL;
if (!rawUrl) {
  throw new Error(
    "TEST_DATABASE_URL must be set when running integration tests. " +
      "Create a Neon ephemeral branch and put its connection string in .env.test.local.",
  );
}

const url = sanitizePostgresUrl(rawUrl);

// The production `db` singleton in `lib/db.ts` reads `DATABASE_URL` via
// `lib/env.ts`. Point it at the same ephemeral branch so default service
// instances (imported by integration tests) also hit the test database.
// Use the sanitized URL so `pg-connection-string` does not emit the
// one-shot SSL deprecation warning on each import chain.
process.env.DATABASE_URL = url;
process.env.TEST_DATABASE_URL = url;

// Safe dummies for S3 env vars — integration tests never exercise real
// storage, but `lib/env.ts` validates them at module load.
process.env.STORE_ID ??= "test-store";
process.env.S3_ENDPOINT ??= "https://s3.test.local";
process.env.S3_REGION ??= "us-east-1";
process.env.S3_ACCESS_KEY_ID ??= "test";
process.env.S3_SECRET_ACCESS_KEY ??= "test";
process.env.S3_BUCKET ??= "test-bucket";
process.env.S3_PUBLIC_URL ??= "https://cdn.test.local";

import * as schema from "@/lib/db/schema";

const pool = new Pool({ connectionString: url });

export const testDb: NodePgDatabase<typeof schema> = drizzle(pool, { schema });

/**
 * Table names in the order is irrelevant because TRUNCATE ... CASCADE handles FKs.
 * Keep this list in sync with `lib/db/schema.ts` pgTable declarations.
 */
const TRUNCATE_TABLES = [
  "availability",
  "order_items",
  "orders",
  "product_variants",
  "products",
  "categories",
  "zip_delivery_zones",
  "about_page_contents",
  "legal_page_documents",
  "contact_page_contents",
  "faq_entries",
  "settings",
  "sessions",
  "accounts",
  "verification_tokens",
  "users",
] as const;

export async function truncateAllTables(): Promise<void> {
  const list = TRUNCATE_TABLES.map((t) => `"${t}"`).join(", ");
  await testDb.execute(sql.raw(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`));
}

beforeEach(async () => {
  await truncateAllTables();
});
