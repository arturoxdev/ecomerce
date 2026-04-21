"use client";

import { useCallback, useState } from "react";

import {
  AvailabilityChecker,
  type AvailabilityLabels,
  type AvailabilityResult,
} from "./availability-checker";
import { VariantSelector, type Variant } from "./variant-selector";
import { QuantitySelector } from "@/components/quantity-selector";
import { AddToCartButton } from "./add-to-cart-button";

type Props = {
  productId: string;
  productName: string;
  productSlug: string;
  productPhoto: string | null;
  basePrice: number;
  baseStock: number;
  priceType: "FIXED" | "PER_UNIT";
  variants: Variant[];
  labels: {
    price: string;
    pricePerUnit: string;
    stock: string;
    selectVariant: string;
    availability: AvailabilityLabels;
    addToCart: string;
    addedToCart: string;
    selectDatesFirst: string;
    quantity: string;
    perUnit: string;
  };
};

export function ProductDetailActions({
  productId,
  productName,
  productSlug,
  productPhoto,
  basePrice,
  baseStock,
  priceType,
  variants,
  labels,
}: Props) {
  const hasVariants = variants.length > 0;

  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  const [availabilityResult, setAvailabilityResult] = useState<AvailabilityResult | null>(null);
  const [quantity, setQuantity] = useState(1);

  const currentPrice = selectedVariant ? selectedVariant.price : basePrice;
  const currentStock = selectedVariant ? selectedVariant.stock : baseStock;
  const maxQty = availabilityResult ? Math.min(availabilityResult.available, currentStock) : currentStock;

  const handleAvailabilityConfirmed = useCallback((result: AvailabilityResult) => {
    setAvailabilityResult(result);
    setQuantity(1);
  }, []);

  const handleVariantChange = useCallback((variant: Variant | null) => {
    setSelectedVariant(variant);
    setAvailabilityResult(null);
    setQuantity(1);
  }, []);

  const isAvailable = availabilityResult !== null && availabilityResult.available > 0;

  return (
    <div className="space-y-6">
      {hasVariants ? (
        <VariantSelector
          productId={productId}
          basePrice={basePrice}
          baseStock={baseStock}
          pricingModel={priceType}
          variants={variants}
          labels={{
            price: labels.price,
            pricePerUnit: labels.pricePerUnit,
            stock: labels.stock,
            selectVariant: labels.selectVariant,
            availability: labels.availability,
          }}
          onVariantChange={handleVariantChange}
          onAvailabilityConfirmed={handleAvailabilityConfirmed}
        />
      ) : (
        <>
          {/* Price */}
          <div>
            <p className="text-sm font-medium text-slate-500">{labels.price}</p>
            <p className="text-2xl font-bold text-primary">
              ${basePrice.toFixed(2)}
              {priceType === "PER_UNIT" && (
                <span className="ml-1 text-base font-normal text-slate-500">
                  / {labels.perUnit}
                </span>
              )}
            </p>
          </div>

          {/* Stock (PER_UNIT only) */}
          {priceType === "PER_UNIT" && (
            <p className="text-sm text-slate-500">
              <span className="font-medium">{labels.stock}:</span> {baseStock}
            </p>
          )}

          {/* Availability checker */}
          <AvailabilityChecker
            productId={productId}
            pricingModel={priceType}
            stock={baseStock}
            labels={labels.availability}
            onAvailabilityConfirmed={handleAvailabilityConfirmed}
          />
        </>
      )}

      {/* Quantity selector (PER_UNIT only, shown after availability confirmed) */}
      {priceType === "PER_UNIT" && isAvailable && (
        <QuantitySelector
          value={quantity}
          max={maxQty}
          onChange={setQuantity}
          label={labels.quantity}
        />
      )}

      {/* Add to Cart */}
      <AddToCartButton
        item={{
          productId,
          productName,
          productSlug,
          productPhoto,
          variantId: selectedVariant?.id ?? null,
          variantName: selectedVariant?.name ?? null,
          quantity: priceType === "FIXED" ? 1 : quantity,
          unitPrice: currentPrice,
          priceType,
          startDate: availabilityResult
            ? toDateString(availabilityResult.startDate)
            : "",
          endDate: availabilityResult
            ? toDateString(availabilityResult.endDate)
            : "",
          stock: maxQty,
        }}
        disabled={!isAvailable}
        disabledMessage={labels.selectDatesFirst}
        label={labels.addToCart}
        addedLabel={labels.addedToCart}
      />
    </div>
  );
}

function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
