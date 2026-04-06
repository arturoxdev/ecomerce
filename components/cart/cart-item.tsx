"use client";

import { CalendarDays, Trash2 } from "lucide-react";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import { QuantitySelector } from "@/features/catalog/components";
import type { CartItem as CartItemType } from "@/lib/stores/cart-store";

type Props = {
  item: CartItemType;
  onRemove: (id: string) => void;
  onQuantityChange: (id: string, qty: number) => void;
  labels: {
    remove: string;
    quantity: string;
  };
};

export function CartItem({ item, onRemove, onQuantityChange, labels }: Props) {
  const lineSubtotal = item.unitPrice * item.quantity;

  return (
    <div className="flex gap-4 rounded-lg border border-slate-200 bg-white p-4">
      {/* Product image */}
      <div className="relative size-20 shrink-0 overflow-hidden rounded-md bg-slate-100">
        {item.productPhoto ? (
          <Image
            src={item.productPhoto}
            alt={item.productName}
            fill
            className="object-cover"
            sizes="80px"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-xs text-slate-400">
            No img
          </div>
        )}
      </div>

      {/* Details */}
      <div className="flex flex-1 flex-col gap-2">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              {item.productName}
            </h3>
            {item.variantName && (
              <p className="text-xs text-slate-500">{item.variantName}</p>
            )}
          </div>
          <p className="text-sm font-bold text-slate-900">
            ${lineSubtotal.toFixed(2)}
          </p>
        </div>

        {/* Dates */}
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <CalendarDays className="size-3.5" />
          <span>{item.startDate}</span>
          <span>→</span>
          <span>{item.endDate}</span>
        </div>

        {/* Quantity + Remove */}
        <div className="flex items-center justify-between">
          {item.priceType === "PER_UNIT" ? (
            <QuantitySelector
              value={item.quantity}
              max={item.stock}
              onChange={(qty) => onQuantityChange(item.id, qty)}
              label={labels.quantity}
            />
          ) : (
            <span className="text-xs text-slate-500">
              ${item.unitPrice.toFixed(2)}
            </span>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-slate-400 hover:text-red-500"
            onClick={() => onRemove(item.id)}
          >
            <Trash2 className="size-4" />
            <span className="sr-only">{labels.remove}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
