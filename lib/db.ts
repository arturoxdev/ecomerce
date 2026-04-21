import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";

import * as schema from "./db/schema";
import { env } from "./env";

export const db = drizzle({
  connection: env.DATABASE_URL,
  schema,
});

/**
 * Structural Drizzle database type used by service factories.
 * Kept as the base `NodePgDatabase` shape so both the production `db`
 * (instantiated with a connection string) and the integration `testDb`
 * (instantiated with a pg `Pool`) satisfy it.
 */
export type Database = NodePgDatabase<typeof schema>;
