"use server";

import {
  saveAboutPage as dalSaveAbout,
  saveLegalDocument as dalSaveLegal,
  saveContactPage as dalSaveContact,
  saveHomeMedia as dalSaveHomeMedia,
  removeHomeMedia as dalRemoveHomeMedia,
  createFaqEntry as dalCreateFaq,
  updateFaqEntry as dalUpdateFaq,
  deleteFaqEntry as dalDeleteFaq,
} from "./services/pages-admin.service";
import type { StaticPageFormState } from "./services/pages-admin.service";
import type { LegalPageSlug } from "./services/pages-catalog.service";

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

export async function saveHomeMedia(
  _prev: StaticPageFormState,
  formData: FormData,
): Promise<StaticPageFormState> {
  return dalSaveHomeMedia(_prev, formData);
}

export async function removeHomeMedia(): Promise<StaticPageFormState> {
  return dalRemoveHomeMedia();
}
