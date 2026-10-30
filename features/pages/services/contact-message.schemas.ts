import { z } from "zod";

import type { Locale } from "@/lib/i18n/config";

const messages = {
  es: {
    name: "El nombre es requerido",
    email: "El correo electrónico no es válido",
    eventDate: "La fecha no es válida",
    message: "Cuéntanos un poco sobre tu evento",
  },
  en: {
    name: "Name is required",
    email: "Please enter a valid email",
    eventDate: "Please enter a valid date",
    message: "Tell us a bit about your event",
  },
} as const;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value === "" ? null : value));

export function contactMessageSchema(locale: Locale) {
  const m = messages[locale];
  return z.object({
    name: z.string().trim().min(1, m.name).max(120),
    email: z.email(m.email).max(200),
    phone: optionalText(40),
    eventDate: z
      .union([z.literal(""), z.iso.date(m.eventDate)])
      .transform((value) => (value === "" ? null : value)),
    message: z.string().trim().min(1, m.message).max(5000),
    // Honeypot: campo oculto que solo llenan los bots.
    website: z.string().max(0),
  });
}

export type ContactMessageInput = z.infer<ReturnType<typeof contactMessageSchema>>;

export function parseContactMessageForm(locale: Locale, formData: FormData) {
  return contactMessageSchema(locale).safeParse({
    name: formData.get("name") ?? "",
    email: formData.get("email") ?? "",
    phone: formData.get("phone") ?? "",
    eventDate: formData.get("eventDate") ?? "",
    message: formData.get("message") ?? "",
    website: formData.get("website") ?? "",
  });
}
