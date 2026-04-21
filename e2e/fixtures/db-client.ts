import "dotenv/config";
import path from "node:path";
import dotenv from "dotenv";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "../../lib/db/schema";

dotenv.config({ path: path.resolve(__dirname, "..", "..", ".env.local") });
dotenv.config({ path: path.resolve(__dirname, "..", "..", ".env") });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set to run e2e fixtures");
}
if (!process.env.STORE_ID) {
  throw new Error("STORE_ID must be set to run e2e fixtures");
}

export const E2E_PREFIX = "e2e-" as const;
export const TEST_STORE_ID: string = process.env.STORE_ID;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const testDb: NodePgDatabase<typeof schema> = drizzle(pool, { schema });

export { schema };

export async function closeTestDb(): Promise<void> {
  await pool.end();
}
