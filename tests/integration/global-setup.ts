import path from "node:path";
import dotenv from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

/**
 * Runs once before the integration suite. Reads the Neon ephemeral branch URL
 * from TEST_DATABASE_URL and applies all Drizzle migrations against it so the
 * schema is ready for the tests. Does not seed data.
 */
export default async function globalSetup() {
  dotenv.config({ path: path.resolve(process.cwd(), ".env.test.local") });

  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error(
      "TEST_DATABASE_URL is required for integration tests. " +
        "Create a Neon ephemeral branch and put its connection string in .env.test.local. " +
        "See .env.test.local.example for the expected format.",
    );
  }

  const pool = new Pool({ connectionString: url });
  const db = drizzle(pool);

  try {
    await migrate(db, {
      migrationsFolder: path.resolve(process.cwd(), "drizzle"),
    });
  } finally {
    await pool.end();
  }

  return async () => {
    // Teardown is a no-op: the ephemeral branch lifecycle is managed outside
    // the test runner (by the user or Neon CLI).
  };
}
