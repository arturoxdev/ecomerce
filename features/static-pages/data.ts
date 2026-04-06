import "server-only";

import { and, asc, eq } from "drizzle-orm";

import { getStoreId } from "@/lib/config/tenant";
import { db } from "@/lib/db";
import {
  aboutPageContents,
  contactPageContents,
  faqEntries,
  legalPageDocuments,
} from "@/lib/db/schema";
import type { Locale } from "@/lib/i18n/config";
import type { LegalPageSlug } from "./catalog";
import {
  aboutPageFallbacks,
  contactPageFallbacks,
  faqFallbacks,
  legalPageFallbacks,
} from "./fallbacks";

// ---------------------------------------------------------------------------
// About Page — reads
// ---------------------------------------------------------------------------

const DEFAULT_LOCALE: Locale = "en";

function findAboutByLocale(locale: Locale) {
  return db.query.aboutPageContents.findFirst({
    where: and(
      eq(aboutPageContents.storeId, getStoreId()),
      eq(aboutPageContents.slug, "about"),
      eq(aboutPageContents.locale, locale),
    ),
  });
}

export async function getAboutPage(locale: Locale) {
  try {
    const current = await findAboutByLocale(locale);
    if (current) return current;

    const fallbackRecord =
      locale === DEFAULT_LOCALE
        ? null
        : await findAboutByLocale(DEFAULT_LOCALE);

    return fallbackRecord ?? { slug: "about", locale, ...aboutPageFallbacks[locale] };
  } catch {
    return { slug: "about", locale, ...aboutPageFallbacks[locale] };
  }
}

// ---------------------------------------------------------------------------
// Contact Page — reads
// ---------------------------------------------------------------------------

function findContactByLocale(locale: Locale) {
  return db.query.contactPageContents.findFirst({
    where: and(
      eq(contactPageContents.storeId, getStoreId()),
      eq(contactPageContents.slug, "contact"),
      eq(contactPageContents.locale, locale),
    ),
  });
}

export async function getContactPage(locale: Locale) {
  try {
    const current = await findContactByLocale(locale);
    if (current) return current;

    const fallbackRecord =
      locale === DEFAULT_LOCALE
        ? null
        : await findContactByLocale(DEFAULT_LOCALE);

    return fallbackRecord ?? { slug: "contact", locale, ...contactPageFallbacks[locale] };
  } catch {
    return { slug: "contact", locale, ...contactPageFallbacks[locale] };
  }
}

// ---------------------------------------------------------------------------
// Legal Documents — reads
// ---------------------------------------------------------------------------

function findLegalBySlugAndLocale(slug: LegalPageSlug, locale: Locale) {
  return db.query.legalPageDocuments.findFirst({
    where: and(
      eq(legalPageDocuments.storeId, getStoreId()),
      eq(legalPageDocuments.slug, slug),
      eq(legalPageDocuments.locale, locale),
    ),
  });
}

export async function getLegalDocument(slug: LegalPageSlug, locale: Locale) {
  try {
    const current = await findLegalBySlugAndLocale(slug, locale);
    if (current) return current;

    const fallbackRecord =
      locale === DEFAULT_LOCALE
        ? null
        : await findLegalBySlugAndLocale(slug, DEFAULT_LOCALE);

    return fallbackRecord ?? { slug, locale, ...legalPageFallbacks[slug][locale] };
  } catch {
    return { slug, locale, ...legalPageFallbacks[slug][locale] };
  }
}

// ---------------------------------------------------------------------------
// FAQ — reads
// ---------------------------------------------------------------------------

function findAllFaqByLocale(locale: Locale) {
  return db.query.faqEntries.findMany({
    where: and(
      eq(faqEntries.storeId, getStoreId()),
      eq(faqEntries.locale, locale),
    ),
    orderBy: [asc(faqEntries.sortOrder), asc(faqEntries.createdAt)],
  });
}

export async function getFaqEntries(locale: Locale) {
  try {
    const current = await findAllFaqByLocale(locale);
    if (current.length > 0) return current;

    const fallbackRecords =
      locale === DEFAULT_LOCALE
        ? []
        : await findAllFaqByLocale(DEFAULT_LOCALE);

    return fallbackRecords.length > 0
      ? fallbackRecords
      : faqFallbacks[locale].map((entry) => ({
          id: `${locale}-${entry.sortOrder}`,
          ...entry,
        }));
  } catch {
    return faqFallbacks[locale].map((entry) => ({
      id: `${locale}-${entry.sortOrder}`,
      ...entry,
    }));
  }
}
