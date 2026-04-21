"use client";

export type AvailabilityFetchInput = {
  productId: string;
  variantId?: string | null;
  startDate: string; // "YYYY-MM-DD"
  endDate: string; // "YYYY-MM-DD"
};

export type AvailabilityFetchResult =
  | { ok: true; available: number; pricingModel: "FIXED" | "PER_UNIT" }
  | { ok: false };

/**
 * Talk to `/api/availability`. Kept as a client service so the component
 * consuming it stays focused on UI state (debounce, rendering).
 */
export async function fetchAvailability(
  input: AvailabilityFetchInput,
): Promise<AvailabilityFetchResult> {
  const params = new URLSearchParams({
    productId: input.productId,
    start: input.startDate,
    end: input.endDate,
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
