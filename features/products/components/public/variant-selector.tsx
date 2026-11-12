"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

export type Variant = {
  id: string;
  name: string;
  price: number;
  stock: number;
};

type Props = {
  basePrice: number;
  variants: Variant[];
  labels: {
    price: string;
    stock: string;
    selectVariant: string;
  };
  onVariantChange?: (variant: Variant | null) => void;
};

export function VariantSelector({
  basePrice,
  variants,
  labels,
  onVariantChange,
}: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = variants.find((v) => v.id === selectedId);
  const displayPrice = selected ? selected.price : basePrice;

  function handleVariantClick(variantId: string) {
    const newId = selectedId === variantId ? null : variantId;
    setSelectedId(newId);
    const newVariant = variants.find((v) => v.id === newId) ?? null;
    onVariantChange?.(newVariant);
  }

  return (
    <div className="space-y-6">
      {/* Price */}
      <div>
        <p className="text-sm font-medium text-slate-500">{labels.price}</p>
        <p className="text-2xl font-bold text-primary">
          ${displayPrice.toFixed(2)}
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
              onClick={() => handleVariantClick(variant.id)}
              className={cn(
                "rounded-lg border px-4 py-2 text-sm font-medium transition-all",
                selectedId === variant.id
                  ? "border-primary bg-primary text-white shadow-sm"
                  : "border-slate-200 bg-white text-slate-700 hover:border-primary hover:text-primary",
              )}
            >
              {variant.name}
            </button>
          ))}
        </div>
      </div>

      {/* Stock: only a chosen variant has rentable stock (ADR-014) */}
      {selected && (
        <p className="text-sm text-slate-500">
          <span className="font-medium">{labels.stock}:</span> {selected.stock}
        </p>
      )}
    </div>
  );
}
