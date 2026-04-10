import type Stripe from "stripe";

import {
  handleChargeRefunded,
  handleCheckoutCompleted,
  handleCheckoutExpired,
  markEventFailed,
  recordEventIfNew,
  stripe,
} from "@/features/checkout";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  if (!sig) return new Response("Missing signature", { status: 400 });

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    logger.error("webhook.missing_secret");
    return new Response("Server misconfigured", { status: 500 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch {
    logger.warn("webhook.invalid_signature");
    return new Response("Invalid signature", { status: 400 });
  }

  const recorded = await recordEventIfNew(event);
  if (!recorded) {
    return Response.json({ received: true, duplicate: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event);
        break;
      case "checkout.session.expired":
      case "checkout.session.async_payment_failed":
        await handleCheckoutExpired(event);
        break;
      case "charge.refunded":
        await handleChargeRefunded(event);
        break;
      default:
        logger.info("webhook.unhandled_event", { type: event.type });
    }
  } catch (err) {
    logger.error("webhook.handler_error", {
      eventId: event.id,
      type: event.type,
      message: err instanceof Error ? err.message : "unknown",
    });
    await markEventFailed(event.id);
    return new Response("Handler error", { status: 500 });
  }

  return Response.json({ received: true });
}
