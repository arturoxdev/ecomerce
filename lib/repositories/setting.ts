import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";

export function getAll() {
  return db.query.settings.findFirst({
    where: eq(settings.id, "global"),
  });
}

export function getByKey<K extends keyof typeof settings.$inferSelect>(key: K) {
  return db.query.settings
    .findFirst({ where: eq(settings.id, "global") })
    .then((s) => s?.[key] ?? null);
}

export function upsert(data: Partial<typeof settings.$inferInsert>) {
  return db
    .insert(settings)
    .values({ id: "global", ...data } as typeof settings.$inferInsert)
    .onConflictDoUpdate({
      target: settings.id,
      set: data,
    });
}
