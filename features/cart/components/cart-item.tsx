"use client";

import { CalendarDays, Trash2 } from "lucide-react";
import Image from "next/image";

import { QuantitySelector } from "@/components/quantity-selector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  isCartItemPastDue,
  type CartItem as CartItemType,
} from "@/lib/stores/cart-store";

type Props = {
  item: CartItemType;
  onRemove: (id: string) => void;
  onQuantityChange: (id: string, qty: number) => void;
  labels: {
    remove: string;
    quantity: string;
    pastDateBadge: string;
  };
};

export function CartItem({ item, onRemove, onQuantityChange, labels }: Props) {
  const lineSubtotal = item.unitPrice * item.quantity;
  const isPast = isCartItemPastDue(item);

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

        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <CalendarDays className="size-3.5" />
          <span>{item.date}</span>
          {isPast && (
            <Badge variant="destructive" className="ml-1">
              {labels.pastDateBadge}
            </Badge>
          )}
        </div>

        {/* ADR-009: selected Local Services for this line (charged once/line) */}
        {item.selectedServices.length > 0 && (
          <ul className="flex flex-col gap-0.5" data-testid="cart-item-services">
            {item.selectedServices.map((service) => (
              <li
                key={service.id}
                className="flex items-center justify-between text-xs text-slate-500"
              >
                <span className="truncate">+ {service.name}</span>
                <span className="shrink-0 font-medium text-slate-600">
                  ${service.price.toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
        )}

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
