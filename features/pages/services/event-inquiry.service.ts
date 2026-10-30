import "server-only";

import { headers } from "next/headers";

import { localeSchema } from "./pages-admin.schemas";
import { parseEventInquiryForm } from "./event-inquiry.schemas";
import { sendEventInquiryNotification } from "@/lib/email";
import {
  internalProblem,
  tooManyRequestsProblem,
  validationProblem,
} from "@/lib/problems";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import type { FormState } from "@/lib/types/form-state";

const copy = {
  es: {
    invalid: "Revisa tu correo.",
    rateLimited: "Enviaste varias solicitudes seguidas. Intenta de nuevo en unos minutos.",
    failed: "No pudimos enviar tu solicitud. Intenta de nuevo o usa la página de contacto.",
  },
  en: {
    invalid: "Please check your email.",
    rateLimited: "You sent several requests in a row. Please try again in a few minutes.",
    failed: "We couldn't send your request. Please try again or use the contact page.",
  },
} as const;

export async function sendEventInquiry(
  localeInput: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const locale = localeSchema.catch("en").parse(localeInput);
  const t = copy[locale];

  const rate = await checkRateLimit(
    `event-inquiry:ip:${getClientIp(await headers())}`,
    5,
    60 * 10,
  );
  if (!rate.allowed) {
    return tooManyRequestsProblem(t.rateLimited);
  }

  const parsed = parseEventInquiryForm(locale, formData);
  if (!parsed.success) {
    // Un bot llenó el honeypot: fingimos éxito para no darle señal.
    if (parsed.error.issues.some((issue) => issue.path[0] === "website")) {
      return { success: true };
    }
    return validationProblem(parsed.error, t.invalid);
  }

  try {
    const sent = await sendEventInquiryNotification({
      email: parsed.data.email,
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
