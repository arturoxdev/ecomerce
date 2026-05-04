import "server-only";

import { and, asc, eq } from "drizzle-orm";

import { getStoreId } from "@/lib/config/tenant";
import { db } from "@/lib/db";
import {
  aboutPageContents,
  contactPageContents,
  faqEntries,
  homePageContents,
  legalPageDocuments,
} from "@/lib/db/schema";
import type { Locale } from "@/lib/i18n/config";
import type { LegalPageSlug } from "./pages-catalog.service";
import {
  aboutPageFallbacks,
  contactPageFallbacks,
  faqFallbacks,
  homePageFallbacks,
  legalPageFallbacks,
} from "./pages-fallbacks.service";

export type PageSource =
  | "db"
  | "fallback-default-locale"
  | "fallback-bundled";

export type PageResult<T> = { source: PageSource; data: T };

const DEFAULT_LOCALE: Locale = "en";

// ---------------------------------------------------------------------------
// About Page — reads
// ---------------------------------------------------------------------------

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
  const current = await findAboutByLocale(locale);
  if (current) return { source: "db" as const, data: current };

  if (locale !== DEFAULT_LOCALE) {
    const fallback = await findAboutByLocale(DEFAULT_LOCALE);
    if (fallback) {
      return {
        source: "fallback-default-locale" as const,
        data: { ...fallback, locale },
      };
    }
  }

  return {
    source: "fallback-bundled" as const,
    data: { slug: "about" as const, locale, ...aboutPageFallbacks[locale] },
  };
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
  const current = await findContactByLocale(locale);
  if (current) return { source: "db" as const, data: current };

  if (locale !== DEFAULT_LOCALE) {
    const fallback = await findContactByLocale(DEFAULT_LOCALE);
    if (fallback) {
      return {
        source: "fallback-default-locale" as const,
        data: { ...fallback, locale },
      };
    }
  }

  return {
    source: "fallback-bundled" as const,
    data: {
      slug: "contact" as const,
      locale,
      ...contactPageFallbacks[locale],
    },
  };
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
  const current = await findLegalBySlugAndLocale(slug, locale);
  if (current) return { source: "db" as const, data: current };

  if (locale !== DEFAULT_LOCALE) {
    const fallback = await findLegalBySlugAndLocale(slug, DEFAULT_LOCALE);
    if (fallback) {
      return {
        source: "fallback-default-locale" as const,
        data: { ...fallback, locale },
      };
    }
  }

  return {
    source: "fallback-bundled" as const,
    data: { slug, locale, ...legalPageFallbacks[slug][locale] },
  };
}

// ---------------------------------------------------------------------------
// Home Page — reads
// ---------------------------------------------------------------------------

function findHomeByStoreId() {
  return db.query.homePageContents.findFirst({
    where: and(
      eq(homePageContents.storeId, getStoreId()),
      eq(homePageContents.slug, "home"),
    ),
  });
}

export async function getHomeMedia(): Promise<{
  source: "db" | "fallback-bundled";
  data: { heroMediaUrl: string };
}> {
  try {
    const current = await findHomeByStoreId();
    if (current?.heroMediaUrl) {
      return { source: "db", data: { heroMediaUrl: current.heroMediaUrl } };
    }
  } catch {
    // tabla puede no existir antes de correr la migración — caemos al fallback
  }
  return {
    source: "fallback-bundled",
    data: { heroMediaUrl: homePageFallbacks.heroMediaUrl },
  };
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
  const current = await findAllFaqByLocale(locale);
  if (current.length > 0) return { source: "db" as const, data: current };

  if (locale !== DEFAULT_LOCALE) {
    const fallback = await findAllFaqByLocale(DEFAULT_LOCALE);
    if (fallback.length > 0) {
      return {
        source: "fallback-default-locale" as const,
        data: fallback,
      };
    }
  }

  return {
    source: "fallback-bundled" as const,
    data: faqFallbacks[locale].map((entry) => ({
      id: `${locale}-${entry.sortOrder}`,
      ...entry,
    })),
  };
}
