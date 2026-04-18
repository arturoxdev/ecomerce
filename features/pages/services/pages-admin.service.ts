import "server-only";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import {
  localeSchema,
  parseAboutForm,
  parseContactForm,
  parseFaqPayload,
  parseMarkdownForm,
} from "./pages-admin.schemas";
import { requireWriteAccess } from "@/lib/services/auth";
import { getStoreId } from "@/lib/config/tenant";
import { db } from "@/lib/db";
import {
  aboutPageContents,
  contactPageContents,
  faqEntries,
  legalPageDocuments,
} from "@/lib/db/schema";
import type { Locale } from "@/lib/i18n/config";
import type { LegalPageSlug } from "./pages-catalog.service";
import {
  forbiddenProblem,
  internalProblem,
  notFoundProblem,
  validationProblem,
} from "@/lib/problems";
import type { FormState } from "@/lib/types/form-state";

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
// Reads (admin-only, used by editor pages)
// ---------------------------------------------------------------------------

export function findAboutByLocale(locale: Locale) {
  return db.query.aboutPageContents.findFirst({
    where: and(
      eq(aboutPageContents.storeId, getStoreId()),
      eq(aboutPageContents.slug, "about"),
      eq(aboutPageContents.locale, locale),
    ),
  });
}

export function findContactByLocale(locale: Locale) {
  return db.query.contactPageContents.findFirst({
    where: and(
      eq(contactPageContents.storeId, getStoreId()),
      eq(contactPageContents.slug, "contact"),
      eq(contactPageContents.locale, locale),
    ),
  });
}

export function findLegalBySlugAndLocale(slug: LegalPageSlug, locale: Locale) {
  return db.query.legalPageDocuments.findFirst({
    where: and(
      eq(legalPageDocuments.storeId, getStoreId()),
      eq(legalPageDocuments.slug, slug),
      eq(legalPageDocuments.locale, locale),
    ),
  });
}

export function findFaqById(id: string) {
  return db.query.faqEntries.findFirst({
    where: and(eq(faqEntries.id, id), eq(faqEntries.storeId, getStoreId())),
  });
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type StaticPageFormState = FormState;

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export async function saveAboutPage(
  localeInput: string,
  _prev: StaticPageFormState,
  formData: FormData,
): Promise<StaticPageFormState> {
  await requireWriteAccess();
  const locale = ensureLocale(localeInput);

  const parsed = parseAboutForm(formData);
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

  const parsed = parseMarkdownForm(formData);
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

  const parsed = parseContactForm(formData);
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
  const parsed = parseFaqPayload(payload);

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
  const parsed = parseFaqPayload(payload);

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
