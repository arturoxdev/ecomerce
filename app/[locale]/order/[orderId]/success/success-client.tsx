"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useCartStore } from "@/lib/stores/cart-store";

type Props = {
  orderId: string;
  locale: string;
  poll?: boolean;
};

export function SuccessClient({ poll }: Props) {
  const clearCart = useCartStore((s) => s.clearCart);
  const router = useRouter();

  useEffect(() => {
    clearCart();
  }, [clearCart]);

  useEffect(() => {
    if (!poll) return;
    const id = setInterval(() => router.refresh(), 3000);
    return () => clearInterval(id);
  }, [poll, router]);

  return null;
}
