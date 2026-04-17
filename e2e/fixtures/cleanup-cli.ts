import { closeTestDb } from "./db-client";
import { cleanupTestData } from "./seed-helpers";

async function main() {
  console.log("Running e2e cleanup…");
  await cleanupTestData();
  console.log("Cleanup complete.");
  await closeTestDb();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
