"use server";

import {
  saveAboutPage as dalSaveAbout,
  saveLegalDocument as dalSaveLegal,
  saveContactPage as dalSaveContact,
  createFaqEntry as dalCreateFaq,
  updateFaqEntry as dalUpdateFaq,
  deleteFaqEntry as dalDeleteFaq,
} from "./data";
import type { StaticPageFormState } from "./data";
import type { LegalPageSlug } from "@/features/static-pages";

export async function saveAboutPage(
  localeInput: string,
  _prev: StaticPageFormState,
  formData: FormData,
): Promise<StaticPageFormState> {
  return dalSaveAbout(localeInput, _prev, formData);
}

export async function saveLegalDocument(
  slug: LegalPageSlug,
  localeInput: string,
  _prev: StaticPageFormState,
  formData: FormData,
): Promise<StaticPageFormState> {
  return dalSaveLegal(slug, localeInput, _prev, formData);
}

export async function saveContactPage(
  localeInput: string,
  _prev: StaticPageFormState,
  formData: FormData,
): Promise<StaticPageFormState> {
  return dalSaveContact(localeInput, _prev, formData);
}

export async function createFaqEntry(
  localeInput: string,
  payload: { question: string; answer: string; sortOrder: number },
) {
  return dalCreateFaq(localeInput, payload);
}

export async function updateFaqEntry(
  id: string,
  localeInput: string,
  payload: { question: string; answer: string; sortOrder: number },
) {
  return dalUpdateFaq(id, localeInput, payload);
}

export async function deleteFaqEntry(id: string) {
  return dalDeleteFaq(id);
}
