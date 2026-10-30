"use server";

import {
  saveAboutPage as dalSaveAbout,
  saveLegalDocument as dalSaveLegal,
  saveContactPage as dalSaveContact,
  saveHomeMedia as dalSaveHomeMedia,
  removeHomeMedia as dalRemoveHomeMedia,
  saveHomeHeroTexts as dalSaveHomeHeroTexts,
  createFaqEntry as dalCreateFaq,
  updateFaqEntry as dalUpdateFaq,
  deleteFaqEntry as dalDeleteFaq,
} from "./services/pages-admin.service";
import type { StaticPageFormState } from "./services/pages-admin.service";
import { sendContactMessage as svcSendContactMessage } from "./services/contact-message.service";
import { sendEventInquiry as svcSendEventInquiry } from "./services/event-inquiry.service";
import type { FormState } from "@/lib/types/form-state";
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

export async function saveHomeHeroTexts(
  localeInput: string,
  _prev: StaticPageFormState,
  formData: FormData,
): Promise<StaticPageFormState> {
  return dalSaveHomeHeroTexts(localeInput, _prev, formData);
}

export async function sendContactMessage(
  localeInput: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  return svcSendContactMessage(localeInput, _prev, formData);
}

export async function sendEventInquiry(
  localeInput: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  return svcSendEventInquiry(localeInput, _prev, formData);
}
