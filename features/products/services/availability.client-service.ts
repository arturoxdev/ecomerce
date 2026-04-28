"use client";

export type AvailabilityFetchInput = {
  productId: string;
  variantId?: string | null;
  date: string; // "YYYY-MM-DD"
};

export type AvailabilityFetchResult =
  | { ok: true; available: number; pricingModel: "FIXED" | "PER_UNIT" }
  | { ok: false };

export async function fetchAvailability(
  input: AvailabilityFetchInput,
): Promise<AvailabilityFetchResult> {
  const params = new URLSearchParams({
    productId: input.productId,
    date: input.date,
  });
  if (input.variantId) params.set("variantId", input.variantId);

  const res = await fetch(`/api/availability?${params}`);
  if (!res.ok) return { ok: false };

  const data = (await res.json()) as {
    available: number;
    pricingModel: "FIXED" | "PER_UNIT";
  };
  return {
    ok: true,
    available: Math.max(0, data.available),
    pricingModel: data.pricingModel,
  };
}

export type AvailabilityMonthFetchInput = {
  productId: string;
  variantId?: string | null;
  month: string; // "YYYY-MM"
};

export type AvailabilityMonthFetchResult =
  | { ok: true; unavailableDates: string[] }
  | { ok: false };

export async function fetchUnavailableDates(
  input: AvailabilityMonthFetchInput,
): Promise<AvailabilityMonthFetchResult> {
  const params = new URLSearchParams({
    productId: input.productId,
    month: input.month,
  });
  if (input.variantId) params.set("variantId", input.variantId);

  const res = await fetch(`/api/availability/month?${params}`);
  if (!res.ok) return { ok: false };

  const data = (await res.json()) as { unavailableDates: string[] };
  return { ok: true, unavailableDates: data.unavailableDates };
}
