import "server-only";

import { and, eq, lt, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type Stripe from "stripe";

import { stripe } from "./client";
import { recordAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import {
  availability,
  orders,
  stripeWebhookEvents,
  type PaymentMode,
} from "@/lib/db/schema";
import { logger } from "@/lib/logger";
import { internalProblem, notFoundProblem } from "@/lib/problems";
import type { ProblemDetail } from "@/lib/types/problem-detail";

type OrderRow = typeof orders.$inferSelect;
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

const SESSION_EXPIRY_SECONDS = 30 * 60;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function requireAppUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL;
  if (!url) throw new Error("NEXT_PUBLIC_APP_URL is required");
  return url.replace(/\/$/, "");
}

export function computeOnlineAmountCents(
  order: Pick<OrderRow, "total">,
  settings: { paymentMode: PaymentMode },
): number {
  const total = parseFloat(order.total);
  const portion = settings.paymentMode === "FULL_ONLINE" ? 1 : 0.5;
  return Math.round(total * portion * 100);
}

function buildDescription(
  order: OrderRow,
  settings: { paymentMode: PaymentMode },
): string {
  const short = order.id.slice(0, 8);
  const amount = (computeOnlineAmountCents(order, settings) / 100).toFixed(2);
  return settings.paymentMode === "FULL_ONLINE"
    ? `Order ${short} — $${amount} USD`
    : `Order ${short} — 50% deposit $${amount} USD (balance on delivery)`;
}

async function getOrderByIdForUpdate(
  tx: Tx,
  orderId: string,
): Promise<OrderRow | undefined> {
  const rows = await tx.execute<OrderRow>(
    sql`SELECT * FROM orders WHERE id = ${orderId}::uuid FOR UPDATE`,
  );
  return rows.rows[0] as OrderRow | undefined;
}

async function getOrderByPaymentIntentForUpdate(
  tx: Tx,
  paymentIntentId: string,
): Promise<OrderRow | undefined> {
  const rows = await tx.execute<OrderRow>(
    sql`SELECT * FROM orders WHERE stripe_payment_intent_id = ${paymentIntentId} FOR UPDATE`,
  );
  return rows.rows[0] as OrderRow | undefined;
}

export async function recordEventIfNew(
  event: Pick<Stripe.Event, "id" | "type">,
): Promise<boolean> {
  const result = await db
    .insert(stripeWebhookEvents)
    .values({ eventId: event.id, type: event.type })
    .onConflictDoNothing()
    .returning();
  return result.length > 0;
}

export async function markEventFailed(eventId: string): Promise<void> {
  await db
    .update(stripeWebhookEvents)
    .set({ status: "failed" })
    .where(eq(stripeWebhookEvents.eventId, eventId));
}

// ---------------------------------------------------------------------------
// createCheckoutSession
// ---------------------------------------------------------------------------

export type CreateCheckoutResult =
  | { success: true; url: string }
  | ProblemDetail;

export async function createCheckoutSession(
  orderId: string,
  locale: string = "en",
): Promise<CreateCheckoutResult> {
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
  });
  if (!order) return notFoundProblem("Order not found");
  if (order.status !== "PENDING") {
    return notFoundProblem("Order is not pending payment");
  }

  // Reuse an existing open session when possible.
  if (order.stripeSessionId) {
    try {
      const existing = await stripe.checkout.sessions.retrieve(
        order.stripeSessionId,
      );
      if (existing.status === "open" && existing.url) {
        return { success: true, url: existing.url };
      }
    } catch {
      // fall through — create a new one
    }
  }

  const settingsRow = await db.query.settings.findFirst();
  const paymentMode: PaymentMode = settingsRow?.paymentMode ?? "SPLIT_50_50";
  const amount = computeOnlineAmountCents(order, { paymentMode });
  if (amount < 50) {
    return internalProblem("Amount below Stripe minimum ($0.50 USD)");
  }

  const shortId = order.id.slice(0, 8);
  const appUrl = requireAppUrl();
  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name:
                paymentMode === "FULL_ONLINE"
                  ? `Order ${shortId}`
                  : `50% deposit — Order ${shortId}`,
              description: buildDescription(order, { paymentMode }),
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      expires_at: Math.floor(Date.now() / 1000) + SESSION_EXPIRY_SECONDS,
      success_url: `${appUrl}/${locale}/order/${order.id}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/${locale}/order/${order.id}/cancelled`,
      metadata: {
        orderId: order.id,
        storeId: order.storeId,
        expectedAmountCents: String(amount),
        paymentMode,
      },
      customer_email: order.customerEmail,
    });
  } catch (err) {
    logger.error("checkout.session_create_failed", {
      orderId: order.id,
      message: err instanceof Error ? err.message : "unknown",
    });
    return internalProblem("Could not create Stripe checkout session");
  }

  await db
    .update(orders)
    .set({
      stripeSessionId: session.id,
      stripePaymentIntentId: (session.payment_intent as string) ?? null,
      stripeSessionExpiresAt: new Date(session.expires_at * 1000),
    })
    .where(eq(orders.id, order.id));

  if (!session.url) return internalProblem("Stripe returned no checkout URL");
  return { success: true, url: session.url };
}

// ---------------------------------------------------------------------------
// Webhook handlers
// ---------------------------------------------------------------------------

export async function handleCheckoutCompleted(
  event: Stripe.Event,
): Promise<void> {
  const session = event.data.object as Stripe.Checkout.Session;
  const orderId = session.metadata?.orderId;
  if (!orderId) return;

  await db.transaction(async (tx) => {
    const order = await getOrderByIdForUpdate(tx, orderId);
    if (!order) return;
    if (order.paymentStatus === "CAPTURED") return;

    const expected = Number(session.metadata?.expectedAmountCents);
    if (!Number.isFinite(expected) || session.amount_total !== expected) {
      logger.error("security.amount_mismatch", {
        orderId,
        expected,
        received: session.amount_total,
      });
      await tx
        .update(orders)
        .set({ paymentStatus: "SUSPICIOUS" })
        .where(eq(orders.id, orderId));
      await recordAudit(
        {
          action: "webhook.amount_mismatch",
          entity: "order",
          entityId: orderId,
          before: { paymentStatus: order.paymentStatus },
          after: { paymentStatus: "SUSPICIOUS" },
        },
        tx,
      );
      return;
    }
    if (session.currency !== "usd") {
      logger.error("security.currency_mismatch", {
        orderId,
        currency: session.currency,
      });
      await tx
        .update(orders)
        .set({ paymentStatus: "SUSPICIOUS" })
        .where(eq(orders.id, orderId));
      return;
    }
    if (session.payment_status !== "paid") return;

    await tx
      .update(orders)
      .set({
        status: "CONFIRMED",
        paymentStatus: "CAPTURED",
        amountPaid: ((session.amount_total ?? 0) / 100).toFixed(2),
        stripePaymentIntentId: (session.payment_intent as string) ?? null,
      })
      .where(eq(orders.id, orderId));

    await recordAudit(
      {
        action: "webhook.checkout_completed",
        entity: "order",
        entityId: orderId,
        before: {
          status: order.status,
          paymentStatus: order.paymentStatus,
        },
        after: { status: "CONFIRMED", paymentStatus: "CAPTURED" },
      },
      tx,
    );
  });

  revalidatePath(`/en/order/${orderId}/success`);
  revalidatePath(`/es/order/${orderId}/success`);
  revalidatePath(`/admin/orders/${orderId}`);
}

export async function handleCheckoutExpired(
  event: Stripe.Event,
): Promise<void> {
  const session = event.data.object as Stripe.Checkout.Session;
  const orderId = session.metadata?.orderId;
  if (!orderId) return;

  await db.transaction(async (tx) => {
    const order = await getOrderByIdForUpdate(tx, orderId);
    if (!order) return;
    if (order.paymentStatus === "CAPTURED") return;

    await tx
      .update(orders)
      .set({ status: "CANCELLED", paymentStatus: "FAILED" })
      .where(eq(orders.id, orderId));

    await tx.delete(availability).where(eq(availability.orderId, orderId));

    await recordAudit(
      {
        action: "webhook.checkout_expired",
        entity: "order",
        entityId: orderId,
        before: {
          status: order.status,
          paymentStatus: order.paymentStatus,
        },
        after: { status: "CANCELLED", paymentStatus: "FAILED" },
      },
      tx,
    );
  });
}

export async function handleChargeRefunded(
  event: Stripe.Event,
): Promise<void> {
  const charge = event.data.object as Stripe.Charge;
  const pi =
    typeof charge.payment_intent === "string"
      ? charge.payment_intent
      : charge.payment_intent?.id;
  if (!pi) return;

  await db.transaction(async (tx) => {
    const order = await getOrderByPaymentIntentForUpdate(tx, pi);
    if (!order) return;

    await tx
      .update(orders)
      .set({
        status: "CANCELLED",
        paymentStatus: "VOIDED",
        amountPaid: "0",
      })
      .where(eq(orders.id, order.id));

    await tx.delete(availability).where(eq(availability.orderId, order.id));

    await recordAudit(
      {
        action: "webhook.charge_refunded",
        entity: "order",
        entityId: order.id,
        before: {
          status: order.status,
          paymentStatus: order.paymentStatus,
          amountPaid: order.amountPaid,
        },
        after: { status: "CANCELLED", paymentStatus: "VOIDED", amountPaid: "0" },
      },
      tx,
    );
  });
}

// ---------------------------------------------------------------------------
// Reconciliation (Scope C.2, C.3)
// ---------------------------------------------------------------------------

export async function reconcileStripeOrder(order: OrderRow): Promise<void> {
  if (!order.stripeSessionId) return;

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.retrieve(order.stripeSessionId);
  } catch (err) {
    logger.warn("reconcile.retrieve_failed", {
      orderId: order.id,
      message: err instanceof Error ? err.message : "unknown",
    });
    return;
  }

  const syntheticId = `reconcile:${session.id}:${session.status}`;
  const recorded = await recordEventIfNew({
    id: syntheticId,
    type: `reconcile.${session.status}` as Stripe.Event["type"],
  });
  if (!recorded) return;

  const fakeEvent = { data: { object: session } } as unknown as Stripe.Event;

  if (session.status === "complete" && session.payment_status === "paid") {
    await handleCheckoutCompleted(fakeEvent);
  } else if (session.status === "expired") {
    await handleCheckoutExpired(fakeEvent);
  } else if (session.status === "open") {
    // still open — nothing to do
  }
}

export async function findStuckPendingOrders(limit = 100) {
  return db
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.status, "PENDING"),
        lt(
          orders.stripeSessionExpiresAt,
          new Date(Date.now() - 5 * 60 * 1000),
        ),
      ),
    )
    .limit(limit);
}
