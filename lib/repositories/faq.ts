import { asc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { faqEntries } from "@/lib/db/schema";
import type { Locale } from "@/lib/i18n/config";

export function findAllByLocale(locale: Locale) {
  return db.query.faqEntries.findMany({
    where: eq(faqEntries.locale, locale),
    orderBy: [asc(faqEntries.sortOrder), asc(faqEntries.createdAt)],
  });
}

export function findById(id: string) {
  return db.query.faqEntries.findFirst({
    where: eq(faqEntries.id, id),
  });
}

export function create(data: typeof faqEntries.$inferInsert) {
  return db.insert(faqEntries).values(data).returning().then((rows) => rows[0]);
}

export function update(id: string, data: Partial<typeof faqEntries.$inferInsert>) {
  return db
    .update(faqEntries)
    .set(data)
    .where(eq(faqEntries.id, id))
    .returning()
    .then((rows) => rows[0]);
}

export function remove(id: string) {
  return db.delete(faqEntries).where(eq(faqEntries.id, id));
}
