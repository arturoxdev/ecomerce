import { cleanupTestData } from "./seed-helpers";
import { closeTestDb } from "./db-client";

export default async function globalTeardown(): Promise<void> {
  try {
    await cleanupTestData();
  } finally {
    await closeTestDb();
  }
}
