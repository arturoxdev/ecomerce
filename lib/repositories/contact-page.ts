import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { contactPageContents } from "@/lib/db/schema";
import type { Locale } from "@/lib/i18n/config";

export function findByLocale(locale: Locale) {
  return db.query.contactPageContents.findFirst({
    where: and(eq(contactPageContents.slug, "contact"), eq(contactPageContents.locale, locale)),
  });
}

export function upsert(
  locale: Locale,
  data: Omit<typeof contactPageContents.$inferInsert, "slug" | "locale">,
) {
  return db
    .insert(contactPageContents)
    .values({ slug: "contact", locale, ...data })
    .onConflictDoUpdate({
      target: [contactPageContents.slug, contactPageContents.locale],
      set: data,
    })
    .returning()
    .then((rows) => rows[0]);
}
