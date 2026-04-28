"use client";

import { useEffect, useRef, useState } from "react";

import { fetchUnavailableDates } from "@/lib/api/availability-client";

export type UseUnavailableDatesInput = {
  productId: string;
  variantId?: string | null;
  visibleMonth: Date;
};

export type UseUnavailableDatesResult = {
  unavailableDates: Date[];
  loading: boolean;
};

function monthKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function useUnavailableDates(
  input: UseUnavailableDatesInput,
): UseUnavailableDatesResult {
  const [unavailableDates, setUnavailableDates] = useState<Date[]>([]);
  const [loading, setLoading] = useState(false);
  const cache = useRef(new Map<string, Date[]>());

  const month = monthKey(input.visibleMonth);
  const cacheKey = `${input.productId}:${input.variantId ?? ""}:${month}`;

  useEffect(() => {
    const cached = cache.current.get(cacheKey);
    if (cached) {
      setUnavailableDates(cached);
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetchUnavailableDates({
      productId: input.productId,
      variantId: input.variantId,
      month,
    })
      .then((res) => {
        if (cancelled) return;
        const dates = res.ok
          ? res.unavailableDates.map((s) => new Date(`${s}T00:00:00`))
          : [];
        cache.current.set(cacheKey, dates);
        setUnavailableDates(dates);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [cacheKey, input.productId, input.variantId, month]);

  return { unavailableDates, loading };
}
