import "server-only";

import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { headers } from "next/headers";

import { localeSchema } from "./pages-admin.schemas";
import { parseContactMessageForm } from "./contact-message.schemas";
import { sendContactMessageNotification } from "@/lib/email";
import {
  internalProblem,
  tooManyRequestsProblem,
  validationProblem,
} from "@/lib/problems";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import type { FormState } from "@/lib/types/form-state";

const copy = {
  es: {
    invalid: "Revisa los campos marcados.",
    rateLimited: "Enviaste varios mensajes seguidos. Intenta de nuevo en unos minutos.",
    failed: "No pudimos enviar tu mensaje. Intenta de nuevo o escríbenos directamente por correo.",
  },
  en: {
    invalid: "Please check the highlighted fields.",
    rateLimited: "You sent several messages in a row. Please try again in a few minutes.",
    failed: "We couldn't send your message. Please try again or email us directly.",
  },
} as const;

export async function sendContactMessage(
  localeInput: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const locale = localeSchema.catch("en").parse(localeInput);
  const t = copy[locale];

  const rate = await checkRateLimit(
    `contact:ip:${getClientIp(await headers())}`,
    5,
    60 * 10,
  );
  if (!rate.allowed) {
    return tooManyRequestsProblem(t.rateLimited);
  }

  const parsed = parseContactMessageForm(locale, formData);
  if (!parsed.success) {
    // Un bot llenó el honeypot: fingimos éxito para no darle señal.
    if (parsed.error.issues.some((issue) => issue.path[0] === "website")) {
      return { success: true };
    }
    return validationProblem(parsed.error, t.invalid);
  }

  const { name, email, phone, eventDate, message } = parsed.data;

  try {
    const sent = await sendContactMessageNotification({
      name,
      email,
      phone,
      eventDate: eventDate
        ? format(parseISO(eventDate), "d 'de' MMMM 'de' yyyy", { locale: es })
        : null,
      message,
      locale,
    });
    if (!sent) {
      return internalProblem(t.failed);
    }
  } catch {
    return internalProblem(t.failed);
  }

  return { success: true };
}
