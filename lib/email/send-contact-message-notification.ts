import "server-only";
import { logger } from "@/lib/logger";
import { getResendClient } from "./client";
import { ContactMessageAdminEmail } from "./templates/contact-message-admin";
import type { ContactMessagePayload } from "./types";

/**
 * Envía el mensaje del formulario de contacto al buzón del owner
 * (ORDER_NOTIFICATION_EMAIL). A diferencia de la notificación de órdenes,
 * aquí el resultado importa: el visitante debe saber si su mensaje llegó.
 *
 * @returns true si Resend aceptó el correo, false en cualquier otro caso.
 */
export async function sendContactMessageNotification(
  payload: ContactMessagePayload
): Promise<boolean> {
  const resend = getResendClient();
  const from = process.env.RESEND_FROM_EMAIL;
  const to = process.env.ORDER_NOTIFICATION_EMAIL;

  if (!resend || !from || !to) {
    logger.warn(
      "Resend, RESEND_FROM_EMAIL u ORDER_NOTIFICATION_EMAIL no configurados; no se puede enviar el mensaje de contacto",
      { missingClient: !resend, missingFrom: !from, missingTo: !to }
    );
    return false;
  }

  const { error } = await resend.emails.send({
    from,
    to,
    replyTo: payload.email,
    subject: `Nuevo mensaje de contacto — ${payload.name}`,
    react: ContactMessageAdminEmail(payload),
  });

  if (error) {
    logger.error("Resend rechazó el mensaje de contacto", {
      errorName: error.name,
      errorMessage: error.message,
    });
    return false;
  }

  return true;
}
