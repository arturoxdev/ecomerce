import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import "dotenv/config";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "@/lib/db/schema";

type JournalEntry = {
  idx: number;
  version: string;
  when: number;
  tag: string;
  breakpoints: boolean;
};

const migrationsFolder = path.resolve(process.cwd(), "drizzle");
const journalPath = path.join(migrationsFolder, "meta", "_journal.json");

function readJournal(): JournalEntry[] {
  const journal = JSON.parse(fs.readFileSync(journalPath, "utf8")) as {
    entries: JournalEntry[];
  };
  return journal.entries;
}

function migrationHash(tag: string) {
  const sql = fs.readFileSync(path.join(migrationsFolder, `${tag}.sql`), "utf8");
  return crypto.createHash("sha256").update(sql).digest("hex");
}

async function exists(
  pool: Pool,
  query: string,
  params: unknown[] = [],
): Promise<boolean> {
  const result = await pool.query<{ exists: boolean }>(query, params);
  return Boolean(result.rows[0]?.exists);
}

async function detectAppliedCount(pool: Pool) {
  const migration1 = await Promise.all([
    exists(pool, `select exists(select 1 from pg_type where typname = 'user_role')`),
    exists(pool, `select exists(select 1 from information_schema.tables where table_schema = 'public' and table_name = 'categories')`),
    exists(pool, `select exists(select 1 from information_schema.tables where table_schema = 'public' and table_name = 'products')`),
    exists(pool, `select exists(select 1 from information_schema.tables where table_schema = 'public' and table_name = 'orders')`),
    exists(pool, `select exists(select 1 from information_schema.tables where table_schema = 'public' and table_name = 'users')`),
  ]).then((checks) => checks.every(Boolean));

  const migration2 = migration1 && await Promise.all([
    exists(pool, `select exists(select 1 from information_schema.columns where table_schema = 'public' and table_name = 'availability' and column_name = 'reason')`),
    exists(pool, `select exists(select 1 from information_schema.columns where table_schema = 'public' and table_name = 'categories' and column_name = 'sort_order')`),
  ]).then((checks) => checks.every(Boolean));

  const migration3 = migration2 && await Promise.all([
    exists(pool, `select exists(select 1 from pg_type where typname = 'content_locale')`),
    exists(pool, `select exists(select 1 from information_schema.tables where table_schema = 'public' and table_name = 'about_page_contents')`),
    exists(pool, `select exists(select 1 from information_schema.tables where table_schema = 'public' and table_name = 'legal_page_documents')`),
    exists(pool, `select exists(select 1 from information_schema.tables where table_schema = 'public' and table_name = 'contact_page_contents')`),
    exists(pool, `select exists(select 1 from information_schema.tables where table_schema = 'public' and table_name = 'faq_entries')`),
  ]).then((checks) => checks.every(Boolean));

  const migration4 = migration3 && await Promise.all([
    exists(pool, `select exists(select 1 from pg_type where typname = 'payment_mode')`),
    exists(pool, `select exists(select 1 from information_schema.tables where table_schema = 'public' and table_name = 'audit_log')`),
    exists(pool, `select exists(select 1 from information_schema.tables where table_schema = 'public' and table_name = 'rate_limits')`),
    exists(pool, `select exists(select 1 from information_schema.tables where table_schema = 'public' and table_name = 'stripe_webhook_events')`),
    exists(pool, `select exists(select 1 from information_schema.columns where table_schema = 'public' and table_name = 'orders' and column_name = 'stripe_session_id')`),
  ]).then((checks) => checks.every(Boolean));

  // 0004_windy_adam_destine: single-day reservation
  // availability gains `date`, drops `start_date`/`end_date`; order_items gains `rent_date`.
  const migration5 = migration4 && await Promise.all([
    exists(pool, `select exists(select 1 from information_schema.columns where table_schema = 'public' and table_name = 'availability' and column_name = 'date')`),
    exists(pool, `select exists(select 1 from information_schema.columns where table_schema = 'public' and table_name = 'order_items' and column_name = 'rent_date')`),
    exists(pool, `select not exists(select 1 from information_schema.columns where table_schema = 'public' and table_name = 'availability' and column_name = 'start_date')`),
  ]).then((checks) => checks.every(Boolean));

  // 0005_eminent_rictor: payment_method enum and orders.payment_method column
  const migration6 = migration5 && await Promise.all([
    exists(pool, `select exists(select 1 from pg_type where typname = 'payment_method')`),
    exists(pool, `select exists(select 1 from information_schema.columns where table_schema = 'public' and table_name = 'orders' and column_name = 'payment_method')`),
  ]).then((checks) => checks.every(Boolean));

  if (migration6) return 6;
  if (migration5) return 5;
  if (migration4) return 4;
  if (migration3) return 3;
  if (migration2) return 2;
  if (migration1) return 1;
  return 0;
}

async function ensureTrackingTable(pool: Pool) {
  await pool.query(`create schema if not exists "drizzle"`);
  await pool.query(`
    create table if not exists "drizzle"."__drizzle_migrations" (
      id serial primary key,
      hash text not null,
      created_at bigint
    )
  `);
}

async function bootstrapTracking(pool: Pool, entries: JournalEntry[]) {
  await ensureTrackingTable(pool);

  const tracked = await pool.query<{ hash: string; created_at: string }>(
    `select hash, created_at from "drizzle"."__drizzle_migrations" order by created_at asc`,
  );
  const trackedCount = tracked.rows.length;

  // Once the tracking table has rows, drizzle-kit owns the migration state.
  // The legacy schema detector is only useful for projects that had a schema
  // before adopting drizzle-kit (tracking empty + schema populated): in that
  // case we backfill the tracking table from the journal so drizzle-kit knows
  // what's already applied. Otherwise (tracking populated), trust drizzle-kit.
  if (trackedCount > 0) return;

  const appliedCount = await detectAppliedCount(pool);
  for (const entry of entries.slice(0, appliedCount)) {
    await pool.query(
      `insert into "drizzle"."__drizzle_migrations" ("hash", "created_at") values ($1, $2)`,
      [migrationHash(entry.tag), entry.when],
    );
  }
}

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    const entries = readJournal();
    await bootstrapTracking(pool, entries);

    const db = drizzle({ client: pool, schema });
    await migrate(db, { migrationsFolder });
    console.log("Drizzle migrations applied successfully");
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
