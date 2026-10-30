import { z } from "zod";

import type { Locale } from "@/lib/i18n/config";

const messages = {
  es: { email: "El correo electrónico no es válido" },
  en: { email: "Please enter a valid email" },
} as const;

export function eventInquirySchema(locale: Locale) {
  return z.object({
    email: z.email(messages[locale].email).max(200),
    // Honeypot: campo oculto que solo llenan los bots.
    website: z.string().max(0),
  });
}

export function parseEventInquiryForm(locale: Locale, formData: FormData) {
  return eventInquirySchema(locale).safeParse({
    email: (formData.get("email") ?? "").toString().trim(),
    website: formData.get("website") ?? "",
  });
}
