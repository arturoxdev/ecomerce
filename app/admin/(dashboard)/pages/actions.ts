"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireWriteAccess } from "@/lib/auth/session";
import type { Locale } from "@/lib/i18n/config";
import * as aboutPageRepo from "@/lib/repositories/about-page";
import * as contactPageRepo from "@/lib/repositories/contact-page";
import * as faqRepo from "@/lib/repositories/faq";
import * as legalDocumentRepo from "@/lib/repositories/legal-document";
import type { LegalPageSlug } from "@/lib/static-pages/catalog";

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

export type StaticPageFormState = {
  success?: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

function revalidateStaticPage(slug: string) {
  revalidatePath("/admin/pages");
  revalidatePath(`/admin/pages/${slug}`);
  revalidatePath(`/en/${slug}`);
  revalidatePath(`/es/${slug}`);
}

function ensureLocale(locale: string): Locale {
  return localeSchema.parse(locale);
}

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
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    await aboutPageRepo.upsert(locale, parsed.data);
  } catch {
    return { error: "Failed to save About page" };
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
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    await legalDocumentRepo.upsert(slug, locale, parsed.data);
  } catch {
    return { error: "Failed to save document" };
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
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    await contactPageRepo.upsert(locale, parsed.data);
  } catch {
    return { error: "Failed to save Contact page" };
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
    return { error: parsed.error.issues[0]?.message ?? "Invalid FAQ data" };
  }

  try {
    await faqRepo.create({ locale, ...parsed.data });
  } catch {
    return { error: "Failed to create FAQ entry" };
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
    return { error: parsed.error.issues[0]?.message ?? "Invalid FAQ data" };
  }

  const existing = await faqRepo.findById(id);
  if (!existing) {
    return { error: "FAQ entry not found" };
  }

  if (existing.locale !== localeInput) {
    return { error: "Cannot edit an entry from another locale" };
  }

  try {
    await faqRepo.update(id, parsed.data);
  } catch {
    return { error: "Failed to update FAQ entry" };
  }

  revalidateStaticPage("faq");
  return { success: true };
}

export async function deleteFaqEntry(id: string) {
  await requireWriteAccess();
  const existing = await faqRepo.findById(id);
  if (!existing) {
    return { error: "FAQ entry not found" };
  }

  try {
    await faqRepo.remove(id);
  } catch {
    return { error: "Failed to delete FAQ entry" };
  }

  revalidateStaticPage("faq");
  return { success: true };
}
