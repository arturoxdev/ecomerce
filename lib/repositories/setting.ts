import { eq } from "drizzle-orm";

import { getStoreId } from "@/lib/config/tenant";
import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";

export function getAll() {
  return db.query.settings.findFirst({
    where: eq(settings.storeId, getStoreId()),
  });
}

export function getByKey<K extends keyof typeof settings.$inferSelect>(key: K) {
  return db.query.settings
    .findFirst({ where: eq(settings.storeId, getStoreId()) })
    .then((s) => s?.[key] ?? null);
}

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
