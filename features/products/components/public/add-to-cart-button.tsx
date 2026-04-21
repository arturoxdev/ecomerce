"use client";

import { ShoppingCart } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCartStore, type CartItem } from "@/lib/stores/cart-store";

type Props = {
  item: Omit<CartItem, "id">;
  disabled?: boolean;
  disabledMessage?: string;
  label: string;
  addedLabel: string;
  onAdded?: () => void;
  className?: string;
};

export function AddToCartButton({
  item,
  disabled,
  disabledMessage,
  label,
  addedLabel,
  onAdded,
  className,
}: Props) {
  const addItem = useCartStore((s) => s.addItem);

  function handleClick() {
    addItem(item);
    toast.success(addedLabel);
    onAdded?.();
  }

  return (
    <Button
      type="button"
      size="lg"
      className={cn("w-full gap-2", className)}
      onClick={handleClick}
      disabled={disabled}
      title={disabled ? disabledMessage : undefined}
      data-testid="add-to-cart-button"
    >
      <ShoppingCart className="size-4" />
      {label}
    </Button>
  );
}
