import "server-only";
import { logger } from "@/lib/logger";
import { getResendClient } from "./client";
import { EventInquiryAdminEmail } from "./templates/event-inquiry-admin";
import type { EventInquiryPayload } from "./types";

/**
 * Avisa al owner (ORDER_NOTIFICATION_EMAIL) que un visitante dejó su correo
 * en el CTA "¿Planeando un evento grande?" del Home. replyTo = visitante.
 *
 * @returns true si Resend aceptó el correo, false en cualquier otro caso.
 */
export async function sendEventInquiryNotification(
  payload: EventInquiryPayload
): Promise<boolean> {
  const resend = getResendClient();
  const from = process.env.RESEND_FROM_EMAIL;
  const to = process.env.ORDER_NOTIFICATION_EMAIL;

  if (!resend || !from || !to) {
    logger.warn(
      "Resend, RESEND_FROM_EMAIL u ORDER_NOTIFICATION_EMAIL no configurados; no se puede enviar la solicitud de evento",
      { missingClient: !resend, missingFrom: !from, missingTo: !to }
    );
    return false;
  }

  const { error } = await resend.emails.send({
    from,
    to,
    replyTo: payload.email,
    subject: `Solicitud de cotización para evento — ${payload.email}`,
    react: EventInquiryAdminEmail(payload),
  });

  if (error) {
    logger.error("Resend rechazó la solicitud de evento", {
      errorName: error.name,
      errorMessage: error.message,
    });
    return false;
  }

  return true;
}
