import { and, asc, eq } from "drizzle-orm";

import { getStoreId } from "@/lib/config/tenant";
import { db } from "@/lib/db";
import { faqEntries } from "@/lib/db/schema";
import type { Locale } from "@/lib/i18n/config";

export function findAllByLocale(locale: Locale) {
  return db.query.faqEntries.findMany({
    where: and(eq(faqEntries.storeId, getStoreId()), eq(faqEntries.locale, locale)),
    orderBy: [asc(faqEntries.sortOrder), asc(faqEntries.createdAt)],
  });
}

export function findById(id: string) {
  return db.query.faqEntries.findFirst({
    where: and(eq(faqEntries.id, id), eq(faqEntries.storeId, getStoreId())),
  });
}

export function create(data: Omit<typeof faqEntries.$inferInsert, "storeId">) {
  return db.insert(faqEntries).values({ ...data, storeId: getStoreId() }).returning().then((rows) => rows[0]);
}

export function update(id: string, data: Partial<typeof faqEntries.$inferInsert>) {
  return db
    .update(faqEntries)
    .set(data)
    .where(and(eq(faqEntries.id, id), eq(faqEntries.storeId, getStoreId())))
    .returning()
    .then((rows) => rows[0]);
}

export function remove(id: string) {
  return db.delete(faqEntries).where(and(eq(faqEntries.id, id), eq(faqEntries.storeId, getStoreId())));
}
