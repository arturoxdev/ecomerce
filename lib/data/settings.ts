import "server-only";

import { eq } from "drizzle-orm";

import { getStoreId } from "@/lib/config/tenant";
import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import { DEFAULT_THEME_ID } from "@/lib/themes";

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export function getAll() {
  return db.query.settings.findFirst({
    where: eq(settings.storeId, getStoreId()),
  });
}

export function getByKey<K extends keyof typeof settings.$inferSelect>(
  key: K,
) {
  return db.query.settings
    .findFirst({ where: eq(settings.storeId, getStoreId()) })
    .then((s) => s?.[key] ?? null);
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export function upsert(data: Partial<typeof settings.$inferInsert>) {
  const storeId = getStoreId();
  return db
    .insert(settings)
    .values({ storeId, ...data } as typeof settings.$inferInsert)
    .onConflictDoUpdate({
      target: settings.storeId,
      set: data,
    });
}

// ---------------------------------------------------------------------------
// Theme helpers
// ---------------------------------------------------------------------------

export async function getThemeId(): Promise<string> {
  const row = await db.query.settings.findFirst({
    where: eq(settings.storeId, getStoreId()),
    columns: { themeId: true },
  });
  return row?.themeId ?? DEFAULT_THEME_ID;
}

export function setThemeId(themeId: string) {
  return upsert({ themeId });
}
