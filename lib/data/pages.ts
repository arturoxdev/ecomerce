import "server-only";

import { and, asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireWriteAccess } from "@/lib/auth/session";
import { getStoreId } from "@/lib/config/tenant";
import { db } from "@/lib/db";
import {
  aboutPageContents,
  contactPageContents,
  faqEntries,
  legalPageDocuments,
} from "@/lib/db/schema";
import type { Locale } from "@/lib/i18n/config";
import type { LegalPageSlug } from "@/lib/static-pages/catalog";
import {
  aboutPageFallbacks,
  contactPageFallbacks,
  faqFallbacks,
  legalPageFallbacks,
} from "@/lib/static-pages/fallbacks";
import {
  forbiddenProblem,
  internalProblem,
  notFoundProblem,
  validationProblem,
} from "@/lib/problems";
import type { FormState } from "@/lib/types/form-state";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const localeSchema = z.enum(["en", "es"]);

const aboutSchema = z.object({
  eyebrow: z.string().min(1, "Eyebrow is required"),
  title: z.string().min(1, "Title is required"),
  subtitle: z.string().min(1, "Subtitle is required"),
  storyTitle: z.string().min(1, "Story title is required"),
  storyBody: z.string().min(1, "Story body is required"),
  valuesTitle: z.string().min(1, "Values title is required"),
  valuesBody: z.string().min(1, "Values body is required"),
});

const markdownSchema = z.object({
  title: z.string().min(1, "Title is required"),
  subtitle: z.string().min(1, "Subtitle is required"),
  body: z.string().min(1, "Markdown content is required"),
});

const contactSchema = z.object({
  title: z.string().min(1, "Title is required"),
  subtitle: z.string().min(1, "Subtitle is required"),
  location: z.string().min(1, "Location is required"),
  phone: z.string().min(1, "Phone is required"),
  email: z.email("Valid email is required"),
  businessHours: z.string().min(1, "Business hours are required"),
});

const faqSchema = z.object({
  question: z.string().min(1, "Question is required"),
  answer: z.string().min(1, "Answer is required"),
  sortOrder: z.coerce.number().int().min(0, "Sort order must be 0 or more"),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ensureLocale(locale: string): Locale {
  return localeSchema.parse(locale);
}

function revalidateStaticPage(slug: string) {
  revalidatePath("/admin/pages");
  revalidatePath(`/admin/pages/${slug}`);
  revalidatePath(`/en/${slug}`);
  revalidatePath(`/es/${slug}`);
}

// ---------------------------------------------------------------------------
// About Page — reads
// ---------------------------------------------------------------------------

const DEFAULT_LOCALE: Locale = "en";

export function findAboutByLocale(locale: Locale) {
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

export function findContactByLocale(locale: Locale) {
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

export function findLegalBySlugAndLocale(slug: LegalPageSlug, locale: Locale) {
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

export function findAllFaqByLocale(locale: Locale) {
  return db.query.faqEntries.findMany({
    where: and(
      eq(faqEntries.storeId, getStoreId()),
      eq(faqEntries.locale, locale),
    ),
    orderBy: [asc(faqEntries.sortOrder), asc(faqEntries.createdAt)],
  });
}

export function findFaqById(id: string) {
  return db.query.faqEntries.findFirst({
    where: and(eq(faqEntries.id, id), eq(faqEntries.storeId, getStoreId())),
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

// ---------------------------------------------------------------------------
// Mutations (admin — auth required)
// ---------------------------------------------------------------------------

export type StaticPageFormState = FormState;

export async function saveAboutPage(
  localeInput: string,
  _prev: StaticPageFormState,
  formData: FormData,
): Promise<StaticPageFormState> {
  await requireWriteAccess();
  const locale = ensureLocale(localeInput);

  const parsed = aboutSchema.safeParse({
    eyebrow: formData.get("eyebrow"),
    title: formData.get("title"),
    subtitle: formData.get("subtitle"),
    storyTitle: formData.get("storyTitle"),
    storyBody: formData.get("storyBody"),
    valuesTitle: formData.get("valuesTitle"),
    valuesBody: formData.get("valuesBody"),
  });

  if (!parsed.success) {
    return validationProblem(parsed.error);
  }

  try {
    const storeId = getStoreId();
    await db
      .insert(aboutPageContents)
      .values({ storeId, slug: "about", locale, ...parsed.data })
      .onConflictDoUpdate({
        target: [
          aboutPageContents.storeId,
          aboutPageContents.slug,
          aboutPageContents.locale,
        ],
        set: parsed.data,
      });
  } catch {
    return internalProblem("Failed to save About page");
  }

  revalidateStaticPage("about");
  return { success: true };
}

export async function saveLegalDocument(
  slug: LegalPageSlug,
  localeInput: string,
  _prev: StaticPageFormState,
  formData: FormData,
): Promise<StaticPageFormState> {
  await requireWriteAccess();
  const locale = ensureLocale(localeInput);

  const parsed = markdownSchema.safeParse({
    title: formData.get("title"),
    subtitle: formData.get("subtitle"),
    body: formData.get("body"),
  });

  if (!parsed.success) {
    return validationProblem(parsed.error);
  }

  try {
    const storeId = getStoreId();
    await db
      .insert(legalPageDocuments)
      .values({ storeId, slug, locale, ...parsed.data })
      .onConflictDoUpdate({
        target: [
          legalPageDocuments.storeId,
          legalPageDocuments.slug,
          legalPageDocuments.locale,
        ],
        set: parsed.data,
      });
  } catch {
    return internalProblem("Failed to save document");
  }

  revalidateStaticPage(slug);
  return { success: true };
}

export async function saveContactPage(
  localeInput: string,
  _prev: StaticPageFormState,
  formData: FormData,
): Promise<StaticPageFormState> {
  await requireWriteAccess();
  const locale = ensureLocale(localeInput);

  const parsed = contactSchema.safeParse({
    title: formData.get("title"),
    subtitle: formData.get("subtitle"),
    location: formData.get("location"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    businessHours: formData.get("businessHours"),
  });

  if (!parsed.success) {
    return validationProblem(parsed.error);
  }

  try {
    const storeId = getStoreId();
    await db
      .insert(contactPageContents)
      .values({ storeId, slug: "contact", locale, ...parsed.data })
      .onConflictDoUpdate({
        target: [
          contactPageContents.storeId,
          contactPageContents.slug,
          contactPageContents.locale,
        ],
        set: parsed.data,
      });
  } catch {
    return internalProblem("Failed to save Contact page");
  }

  revalidateStaticPage("contact");
  return { success: true };
}

export async function createFaqEntry(
  localeInput: string,
  payload: { question: string; answer: string; sortOrder: number },
) {
  await requireWriteAccess();
  const locale = ensureLocale(localeInput);
  const parsed = faqSchema.safeParse(payload);

  if (!parsed.success) {
    return validationProblem(parsed.error);
  }

  try {
    await db
      .insert(faqEntries)
      .values({ ...parsed.data, locale, storeId: getStoreId() })
      .returning()
      .then((rows) => rows[0]);
  } catch {
    return internalProblem("Failed to create FAQ entry");
  }

  revalidateStaticPage("faq");
  return { success: true };
}

export async function updateFaqEntry(
  id: string,
  localeInput: string,
  payload: { question: string; answer: string; sortOrder: number },
) {
  await requireWriteAccess();
  ensureLocale(localeInput);
  const parsed = faqSchema.safeParse(payload);

  if (!parsed.success) {
    return validationProblem(parsed.error);
  }

  const existing = await findFaqById(id);
  if (!existing) {
    return notFoundProblem("FAQ entry not found");
  }

  if (existing.locale !== localeInput) {
    return forbiddenProblem("Cannot edit an entry from another locale");
  }

  try {
    await db
      .update(faqEntries)
      .set(parsed.data)
      .where(
        and(eq(faqEntries.id, id), eq(faqEntries.storeId, getStoreId())),
      );
  } catch {
    return internalProblem("Failed to update FAQ entry");
  }

  revalidateStaticPage("faq");
  return { success: true };
}

export async function deleteFaqEntry(id: string) {
  await requireWriteAccess();
  const existing = await findFaqById(id);
  if (!existing) {
    return notFoundProblem("FAQ entry not found");
  }

  try {
    await db
      .delete(faqEntries)
      .where(
        and(eq(faqEntries.id, id), eq(faqEntries.storeId, getStoreId())),
      );
  } catch {
    return internalProblem("Failed to delete FAQ entry");
  }

  revalidateStaticPage("faq");
  return { success: true };
}
