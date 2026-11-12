"use client";

import { cn } from "@/lib/utils";

export type Variant = {
  id: string;
  name: string;
  price: number;
  stock: number;
};

type Props = {
  variants: Variant[];
  /** The chosen variant. A product with variants always has one (ADR-014). */
  selected: Variant;
  labels: {
    price: string;
    stock: string;
    selectVariant: string;
  };
  onVariantChange: (variant: Variant) => void;
};

/**
 * The variant the detail page opens on: the cheapest one, so the price matches
 * the "from" price of the product card. Ties keep the first in list order.
 */
export function cheapestVariant(variants: Variant[]): Variant | null {
  return variants.reduce<Variant | null>(
    (cheapest, v) => (cheapest === null || v.price < cheapest.price ? v : cheapest),
    null,
  );
}

export function VariantSelector({
  variants,
  selected,
  labels,
  onVariantChange,
}: Props) {
  return (
    <div className="space-y-6">
      {/* Price */}
      <div>
        <p className="text-sm font-medium text-slate-500">{labels.price}</p>
        <p className="text-2xl font-bold text-primary">
          ${selected.price.toFixed(2)}
        </p>
      </div>

      {/* Variant chips */}
      <div>
        <p className="mb-2 text-sm font-medium text-slate-500">
          {labels.selectVariant}
        </p>
        <div className="flex flex-wrap gap-2">
          {variants.map((variant) => (
            <button
              key={variant.id}
              type="button"
              aria-pressed={selected.id === variant.id}
              onClick={() => onVariantChange(variant)}
              className={cn(
                "rounded-lg border px-4 py-2 text-sm font-medium transition-all",
                selected.id === variant.id
                  ? "border-primary bg-primary text-white shadow-sm"
                  : "border-slate-200 bg-white text-slate-700 hover:border-primary hover:text-primary",
              )}
            >
              {variant.name}
            </button>
          ))}
        </div>
      </div>

      {/* Stock of the chosen variant (ADR-014) */}
      <p className="text-sm text-slate-500">
        <span className="font-medium">{labels.stock}:</span> {selected.stock}
      </p>
    </div>
  );
}
