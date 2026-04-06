"use client";

import { useEffect, useState } from "react";

import { useCartStore, getItemCount } from "@/lib/stores/cart-store";

/**
 * SSR-safe hook that exposes cart item count.
 * Defers reading from localStorage until after hydration to avoid mismatch.
 */
export function useCartCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    // Read initial count after hydration
    setCount(getItemCount(useCartStore.getState().items));

    // Subscribe to changes
    const unsub = useCartStore.subscribe((state) => {
      setCount(getItemCount(state.items));
    });

    return unsub;
  }, []);

  return count;
}
