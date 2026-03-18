import type { Locale } from "@/lib/i18n/config";
import * as aboutPageRepo from "@/lib/repositories/about-page";
import * as contactPageRepo from "@/lib/repositories/contact-page";
import * as faqRepo from "@/lib/repositories/faq";
import * as legalDocumentRepo from "@/lib/repositories/legal-document";
import type { LegalPageSlug } from "@/lib/static-pages/catalog";
import {
  aboutPageFallbacks,
  contactPageFallbacks,
  faqFallbacks,
  legalPageFallbacks,
} from "@/lib/static-pages/fallbacks";

const DEFAULT_LOCALE: Locale = "en";

export async function getAboutPage(locale: Locale) {
  try {
    const current = await aboutPageRepo.findByLocale(locale);
    if (current) {
      return current;
    }

    const fallbackRecord =
      locale === DEFAULT_LOCALE ? null : await aboutPageRepo.findByLocale(DEFAULT_LOCALE);

    return fallbackRecord ?? { slug: "about", locale, ...aboutPageFallbacks[locale] };
  } catch {
    return { slug: "about", locale, ...aboutPageFallbacks[locale] };
  }
}

export async function getContactPage(locale: Locale) {
  try {
    const current = await contactPageRepo.findByLocale(locale);
    if (current) {
      return current;
    }

    const fallbackRecord =
      locale === DEFAULT_LOCALE ? null : await contactPageRepo.findByLocale(DEFAULT_LOCALE);

    return fallbackRecord ?? { slug: "contact", locale, ...contactPageFallbacks[locale] };
  } catch {
    return { slug: "contact", locale, ...contactPageFallbacks[locale] };
  }
}

export async function getLegalDocument(slug: LegalPageSlug, locale: Locale) {
  try {
    const current = await legalDocumentRepo.findBySlugAndLocale(slug, locale);
    if (current) {
      return current;
    }

    const fallbackRecord =
      locale === DEFAULT_LOCALE
        ? null
        : await legalDocumentRepo.findBySlugAndLocale(slug, DEFAULT_LOCALE);

    return fallbackRecord ?? { slug, locale, ...legalPageFallbacks[slug][locale] };
  } catch {
    return { slug, locale, ...legalPageFallbacks[slug][locale] };
  }
}

export async function getFaqEntries(locale: Locale) {
  try {
    const current = await faqRepo.findAllByLocale(locale);
    if (current.length > 0) {
      return current;
    }

    const fallbackRecords =
      locale === DEFAULT_LOCALE ? [] : await faqRepo.findAllByLocale(DEFAULT_LOCALE);

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
