"use client";

import { useEffect, useState } from "react";

import { AvailabilityCalendar } from "@/components/availability-calendar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { QuantitySelector } from "@/components/quantity-selector";

import { fetchAvailability } from "@/lib/api/availability-client";

import type { ProductSearchSuggestion } from "@/features/products/actions";
import type { DraftItem } from "./item-card";

type Props = {
  product: ProductSearchSuggestion | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (item: DraftItem) => void;
};

function startOfDayLocal(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function AddItemDialog({ product, open, onOpenChange, onConfirm }: Props) {
  const activeVariants = product?.variants.filter((v) => v.isActive) ?? [];
  const hasVariants = activeVariants.length > 0;
  const initialVariant = hasVariants ? activeVariants[0]?.id ?? null : null;

  const [variantId, setVariantId] = useState<string | null>(initialVariant);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [quantity, setQuantity] = useState<number>(1);
  const [available, setAvailable] = useState<number | null>(null);

  const today = startOfDayLocal();

  useEffect(() => {
    if (!product || !date) return;
    let cancelled = false;
    fetchAvailability({
      productId: product.id,
      variantId,
      date: toDateString(date),
    }).then((res) => {
      if (cancelled) return;
      setAvailable(res.ok ? res.available : 0);
    });
    return () => {
      cancelled = true;
    };
  }, [date, product, variantId]);

  if (!product) return null;

  const variant = activeVariants.find((v) => v.id === variantId) ?? null;
  const unitPrice = variant
    ? parseFloat(variant.price)
    : parseFloat(product.basePrice);
  const max = available ?? 0;
  const canConfirm = Boolean(date) && quantity >= 1 && quantity <= max;

  function handleConfirm() {
    if (!product || !date) return;
    onConfirm({
      draftId: crypto.randomUUID(),
      productId: product.id,
      productName: product.name + (variant ? ` · ${variant.name}` : ""),
      productPhoto: product.photos[0] ?? null,
      variantId,
      variantName: variant?.name ?? null,
      quantity,
      unitPrice,
      date,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Agregar {product.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {hasVariants && (
            <div>
              <Label className="text-sm font-medium">Variante</Label>
              <RadioGroup
                value={variantId ?? ""}
                onValueChange={setVariantId}
                className="mt-2 grid gap-2"
              >
                {activeVariants.map((v) => (
                  <div key={v.id} className="flex items-center gap-2">
                    <RadioGroupItem value={v.id} id={`variant-${v.id}`} />
                    <Label htmlFor={`variant-${v.id}`} className="font-normal">
                      {v.name} — ${parseFloat(v.price).toFixed(2)}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          )}

          <div>
            <Label className="text-sm font-medium">Fecha</Label>
            <div className="mt-2">
              <AvailabilityCalendar
                productId={product.id}
                variantId={variantId}
                selected={date}
                onSelect={setDate}
                minDate={today}
              />
            </div>
          </div>

          {date && product.priceType === "PER_UNIT" && (
            <div>
              <Label className="text-sm font-medium">Cantidad</Label>
              <div className="mt-2">
                <QuantitySelector
                  value={quantity}
                  min={1}
                  max={max || 1}
                  onChange={setQuantity}
                />
              </div>
            </div>
          )}

          {date && available !== null && (
            <p className="text-xs text-muted-foreground">
              Disponibilidad: {available} unidad
              {available === 1 ? "" : "es"}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={!canConfirm}>
            Agregar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
