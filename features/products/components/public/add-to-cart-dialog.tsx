"use client";

import { useCallback, useState } from "react";
import { ShoppingCart } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { QuantitySelector } from "@/components/quantity-selector";

import {
  AvailabilityCheckerBody,
  type AvailabilityLabels,
  type AvailabilityResult,
} from "./availability-checker";
import { AddToCartButton } from "./add-to-cart-button";

type Props = {
  productId: string;
  productName: string;
  productSlug: string;
  productPhoto: string | null;
  variantId: string | null;
  variantName: string | null;
  unitPrice: number;
  priceType: "FIXED" | "PER_UNIT";
  stock: number;
  labels: {
    availability: AvailabilityLabels;
    addToCart: string;
    addedToCart: string;
    selectDatesFirst: string;
    quantity: string;
  };
};

function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function AddToCartDialog({
  productId,
  productName,
  productSlug,
  productPhoto,
  variantId,
  variantName,
  unitPrice,
  priceType,
  stock,
  labels,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button type="button" size="lg" className="w-full gap-2">
            <ShoppingCart className="size-4" />
            {labels.addToCart}
          </Button>
        }
      />
      {open && (
        <DialogContent
          className="max-w-[calc(100%-1rem)] max-h-[calc(100dvh-1rem)] overflow-y-auto sm:max-w-md"
        >
          <AddToCartDialogBody
            productId={productId}
            productName={productName}
            productSlug={productSlug}
            productPhoto={productPhoto}
            variantId={variantId}
            variantName={variantName}
            unitPrice={unitPrice}
            priceType={priceType}
            stock={stock}
            labels={labels}
            onAdded={() => setOpen(false)}
          />
        </DialogContent>
      )}
    </Dialog>
  );
}

function AddToCartDialogBody({
  productId,
  productName,
  productSlug,
  productPhoto,
  variantId,
  variantName,
  unitPrice,
  priceType,
  stock,
  labels,
  onAdded,
}: Props & { onAdded: () => void }) {
  const [availabilityResult, setAvailabilityResult] =
    useState<AvailabilityResult | null>(null);
  const [quantity, setQuantity] = useState(1);

  const handleConfirmed = useCallback((result: AvailabilityResult) => {
    setAvailabilityResult(result);
    setQuantity(1);
  }, []);

  const handleUnavailable = useCallback(() => {
    setAvailabilityResult(null);
    setQuantity(1);
  }, []);

  const isAvailable =
    availabilityResult !== null && availabilityResult.available > 0;
  const maxQty = availabilityResult
    ? Math.min(availabilityResult.available, stock)
    : stock;

  return (
    <>
      <DialogHeader>
        <DialogTitle className="font-bold">
          {labels.availability.checkDates}
        </DialogTitle>
      </DialogHeader>

      <AvailabilityCheckerBody
        productId={productId}
        variantId={variantId}
        pricingModel={priceType}
        stock={stock}
        labels={labels.availability}
        onAvailabilityConfirmed={handleConfirmed}
        onUnavailable={handleUnavailable}
      />

      {priceType === "PER_UNIT" && isAvailable && (
        <QuantitySelector
          value={quantity}
          max={maxQty}
          onChange={setQuantity}
          label={labels.quantity}
        />
      )}

      <AddToCartButton
        item={{
          productId,
          productName,
          productSlug,
          productPhoto,
          variantId,
          variantName,
          quantity: priceType === "FIXED" ? 1 : quantity,
          unitPrice,
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
        onAdded={onAdded}
      />
    </>
  );
}
