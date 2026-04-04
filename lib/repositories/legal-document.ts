import { and, eq } from "drizzle-orm";

import { getStoreId } from "@/lib/config/tenant";
import { db } from "@/lib/db";
import { legalPageDocuments } from "@/lib/db/schema";
import type { Locale } from "@/lib/i18n/config";
import type { LegalPageSlug } from "@/lib/static-pages/catalog";

export function findBySlugAndLocale(slug: LegalPageSlug, locale: Locale) {
  return db.query.legalPageDocuments.findFirst({
    where: and(
      eq(legalPageDocuments.storeId, getStoreId()),
      eq(legalPageDocuments.slug, slug),
      eq(legalPageDocuments.locale, locale),
    ),
  });
}

export function upsert(
  slug: LegalPageSlug,
  locale: Locale,
  data: Omit<typeof legalPageDocuments.$inferInsert, "slug" | "locale" | "storeId">,
) {
  const storeId = getStoreId();
  return db
    .insert(legalPageDocuments)
    .values({ storeId, slug, locale, ...data })
    .onConflictDoUpdate({
      target: [legalPageDocuments.storeId, legalPageDocuments.slug, legalPageDocuments.locale],
      set: data,
    })
    .returning()
    .then((rows) => rows[0]);
}
