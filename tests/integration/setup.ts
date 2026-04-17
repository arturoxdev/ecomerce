import path from "node:path";
import { beforeEach } from "vitest";
import dotenv from "dotenv";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import { Pool } from "pg";

import * as schema from "@/lib/db/schema";

dotenv.config({ path: path.resolve(process.cwd(), ".env.test.local") });

const url = process.env.TEST_DATABASE_URL;
if (!url) {
  throw new Error(
    "TEST_DATABASE_URL must be set when running integration tests. " +
      "Create a Neon ephemeral branch and put its connection string in .env.test.local.",
  );
}

const pool = new Pool({ connectionString: url });

export const testDb: NodePgDatabase<typeof schema> = drizzle(pool, { schema });
export { schema };

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
