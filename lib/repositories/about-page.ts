import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { aboutPageContents } from "@/lib/db/schema";
import type { Locale } from "@/lib/i18n/config";

export function findByLocale(locale: Locale) {
  return db.query.aboutPageContents.findFirst({
    where: and(eq(aboutPageContents.slug, "about"), eq(aboutPageContents.locale, locale)),
  });
}

export function upsert(
  locale: Locale,
  data: Omit<typeof aboutPageContents.$inferInsert, "slug" | "locale">,
) {
  return db
    .insert(aboutPageContents)
    .values({ slug: "about", locale, ...data })
    .onConflictDoUpdate({
      target: [aboutPageContents.slug, aboutPageContents.locale],
      set: data,
    })
    .returning()
    .then((rows) => rows[0]);
}
