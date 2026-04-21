import "server-only";

import Stripe from "stripe";

const secret = process.env.STRIPE_SECRET_KEY;
if (!secret) {
  throw new Error("STRIPE_SECRET_KEY is required");
}

if (process.env.NODE_ENV === "production") {
  if (!secret.startsWith("sk_live_")) {
    throw new Error("Production requires sk_live_ Stripe key");
  }
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret || !webhookSecret.startsWith("whsec_")) {
    throw new Error("Production requires STRIPE_WEBHOOK_SECRET starting with whsec_");
  }
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl || !appUrl.startsWith("https://")) {
    throw new Error("Production requires HTTPS NEXT_PUBLIC_APP_URL");
  }
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || cronSecret.length < 32) {
    throw new Error("CRON_SECRET must be at least 32 characters");
  }
}

export const stripe = new Stripe(secret, {
  apiVersion: "2025-10-29.clover",
  typescript: true,
});
