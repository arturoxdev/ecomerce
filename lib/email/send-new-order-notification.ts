import "server-only";
import { logger } from "@/lib/logger";
import { getResendClient } from "./client";
import { NewOrderAdminEmail } from "./templates/new-order-admin";
import type { NewOrderNotificationPayload } from "./types";

export async function sendNewOrderNotification(
  payload: NewOrderNotificationPayload
): Promise<void> {
  const resend = getResendClient();
  if (!resend) {
    logger.warn(
      "Resend no configurado; se omite la notificación de nueva orden",
      { orderNumber: payload.orderNumber }
    );
    return;
  }

  const from = process.env.RESEND_FROM_EMAIL;
  const to = process.env.ORDER_NOTIFICATION_EMAIL;

  if (!from || !to) {
    logger.warn(
      "RESEND_FROM_EMAIL u ORDER_NOTIFICATION_EMAIL no configurados; se omite la notificación",
      { orderNumber: payload.orderNumber, missingFrom: !from, missingTo: !to }
    );
    return;
  }

  const subject = `Nueva orden #${payload.orderNumber} — ${payload.customerName}`;

  await resend.emails.send({
    from,
    to,
    subject,
    react: NewOrderAdminEmail(payload),
  });
}
