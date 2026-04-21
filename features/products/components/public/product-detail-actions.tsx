"use client";

import { useCallback, useState } from "react";

import { AddToCartDialog } from "./add-to-cart-dialog";
import type { AvailabilityLabels } from "./availability-checker";
import { VariantSelector, type Variant } from "./variant-selector";

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

  const currentPrice = selectedVariant ? selectedVariant.price : basePrice;
  const currentStock = selectedVariant ? selectedVariant.stock : baseStock;

  const handleVariantChange = useCallback((variant: Variant | null) => {
    setSelectedVariant(variant);
  }, []);

  return (
    <div className="space-y-6">
      {hasVariants ? (
        <VariantSelector
          basePrice={basePrice}
          baseStock={baseStock}
          pricingModel={priceType}
          variants={variants}
          labels={{
            price: labels.price,
            pricePerUnit: labels.pricePerUnit,
            stock: labels.stock,
            selectVariant: labels.selectVariant,
          }}
          onVariantChange={handleVariantChange}
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
        </>
      )}

      {/* Add to Cart (opens dialog with availability checker inside) */}
      <AddToCartDialog
        // Remount when variant changes so the internal availability state resets
        key={selectedVariant?.id ?? "no-variant"}
        productId={productId}
        productName={productName}
        productSlug={productSlug}
        productPhoto={productPhoto}
        variantId={selectedVariant?.id ?? null}
        variantName={selectedVariant?.name ?? null}
        unitPrice={currentPrice}
        priceType={priceType}
        stock={currentStock}
        labels={{
          availability: labels.availability,
          addToCart: labels.addToCart,
          addedToCart: labels.addedToCart,
          selectDatesFirst: labels.selectDatesFirst,
          quantity: labels.quantity,
        }}
      />
    </div>
  );
}
