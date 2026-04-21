import "server-only";

import Stripe from "stripe";

const secret = process.env.STRIPE_SECRET_KEY;
if (!secret) {
  throw new Error("STRIPE_SECRET_KEY is required");
}
if (!process.env.STRIPE_WEBHOOK_SECRET) {
  throw new Error("STRIPE_WEBHOOK_SECRET is required");
}
if (!process.env.NEXT_PUBLIC_APP_URL) {
  throw new Error("NEXT_PUBLIC_APP_URL is required");
}
if (!process.env.CRON_SECRET) {
  throw new Error("CRON_SECRET is required");
}

export const stripe = new Stripe(secret, {
  apiVersion: "2025-10-29.clover",
  typescript: true,
});
