"use client";

import { useSyncExternalStore } from "react";

import { getItemCount, useCartStore } from "@/lib/stores/cart-store";

/**
 * SSR-safe hook that exposes cart item count.
 * Defers reading from localStorage until after hydration to avoid mismatch.
 */
export function useCartCount() {
  return useSyncExternalStore(
    useCartStore.subscribe,
    () => getItemCount(useCartStore.getState().items),
    () => 0,
  );
}
