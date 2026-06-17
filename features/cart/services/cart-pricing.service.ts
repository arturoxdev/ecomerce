import type { PaymentMode } from "@/lib/db/schema";

export type CartStoreSettings = {
  deliveryMode: string;
  deliveryFee: number;
  depositPercent: number;
  paymentMode: PaymentMode;
  currency: string;
  eventWindowStart: string | null;
  eventWindowEnd: string | null;
};

export type CartSummaryInput = {
  subtotal: number;
  settings: CartStoreSettings;
  resolvedZipFee?: number | null;
  // DISTANCE_MILES: fee resolved upstream (server `quoteDelivery`, or the cart's
  // quote endpoint client-side). Kept pure here — no Google call.
  resolvedDistanceFee?: number | null;
  // Sum of selected Additional Services (local per-line + global per-order),
  // re-derived server-side. Optional/defaults to 0 for back-compat (ADR-009).
  servicesTotal?: number | null;
};

export function calculateCartSummary(input: CartSummaryInput) {
  let deliveryFee = 0;
  if (input.settings.deliveryMode === "FIXED_FEE") {
    deliveryFee = input.settings.deliveryFee;
  } else if (input.settings.deliveryMode === "ZIP_CODE") {
    deliveryFee = input.resolvedZipFee ?? 0;
  } else if (input.settings.deliveryMode === "DISTANCE_MILES") {
    deliveryFee = input.resolvedDistanceFee ?? 0;
  }

  const servicesTotal = input.servicesTotal ?? 0;
  const deposit =
    (input.subtotal + servicesTotal) * input.settings.depositPercent;
  const total = input.subtotal + servicesTotal + deliveryFee;

  return {
    deliveryFee,
    servicesTotal,
    deposit,
    total,
  };
}
