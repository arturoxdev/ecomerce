"use client";

import { useCallback, useState } from "react";

import { Badge } from "@/components/ui/badge";

import { AddToCartDialog } from "./add-to-cart-dialog";
import type { AvailabilityLabels } from "./availability-checker";
import {
  ServiceSelector,
  type SelectableService,
  type ServiceSelectorLabels,
} from "./service-selector";
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
  localServices: SelectableService[];
  showSplitNotice?: boolean;
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
    splitBadge?: string;
    splitNotice?: string;
    services: ServiceSelectorLabels;
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
  localServices,
  showSplitNotice = false,
  labels,
}: Props) {
  const hasVariants = variants.length > 0;

  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  const [selectedServices, setSelectedServices] = useState<SelectableService[]>(
    [],
  );

  const variantPrice = selectedVariant ? selectedVariant.price : basePrice;
  const currentStock = selectedVariant ? selectedVariant.stock : baseStock;
  // Local Services are charged ONCE per line (not per unit), so they add a flat
  // amount to the displayed unit/base price preview (ADR-009).
  const servicesTotal = selectedServices.reduce((sum, s) => sum + s.price, 0);
  const currentPrice = variantPrice + servicesTotal;

  const handleVariantChange = useCallback((variant: Variant | null) => {
    setSelectedVariant(variant);
  }, []);

  const handleServiceToggle = useCallback(
    (service: SelectableService, checked: boolean) => {
      setSelectedServices((prev) =>
        checked
          ? [...prev, service]
          : prev.filter((s) => s.id !== service.id),
      );
    },
    [],
  );

  const selectedServiceIds = selectedServices.map((s) => s.id);

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

      {/* Local Services: multi-select, charged once per line (ADR-009) */}
      {localServices.length > 0 && (
        <ServiceSelector
          services={localServices}
          selectedIds={selectedServiceIds}
          onToggle={handleServiceToggle}
          labels={labels.services}
        />
      )}

      {/* Price preview including selected services (added once per line) */}
      {servicesTotal > 0 && (
        <div className="flex items-baseline justify-between border-t border-slate-100 pt-3">
          <span className="text-sm font-medium text-slate-500">
            {labels.price}
          </span>
          <span className="text-lg font-bold text-primary">
            ${currentPrice.toFixed(2)}
            {priceType === "PER_UNIT" && (
              <span className="ml-1 text-sm font-normal text-slate-500">
                / {labels.perUnit}
              </span>
            )}
          </span>
        </div>
      )}

      {showSplitNotice && labels.splitBadge && labels.splitNotice && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
          <Badge variant="secondary" className="mb-2">
            {labels.splitBadge}
          </Badge>
          <p className="text-sm text-slate-600 leading-relaxed">
            {labels.splitNotice}
          </p>
        </div>
      )}

      {/* Add to Cart (opens dialog with availability checker inside) */}
      <AddToCartDialog
        // Remount when variant or service selection changes so the internal
        // availability state resets and the line carries the right services.
        key={`${selectedVariant?.id ?? "no-variant"}:${selectedServiceIds.join(",")}`}
        productId={productId}
        productName={productName}
        productSlug={productSlug}
        productPhoto={productPhoto}
        variantId={selectedVariant?.id ?? null}
        variantName={selectedVariant?.name ?? null}
        unitPrice={variantPrice}
        selectedServices={selectedServices.map((s) => ({
          id: s.id,
          name: s.name,
          price: s.price,
        }))}
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
