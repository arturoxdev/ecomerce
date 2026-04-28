"use client";

import { CalendarDays, Trash2 } from "lucide-react";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import {
  formatAdminCurrency,
  formatAdminDate,
} from "@/lib/admin/format";

export type DraftItem = {
  draftId: string;
  productId: string;
  productName: string;
  productPhoto: string | null;
  variantId: string | null;
  variantName: string | null;
  quantity: number;
  unitPrice: number;
  date: Date;
};

type Props = {
  item: DraftItem;
  onRemove: (draftId: string) => void;
};

export function ItemCard({ item, onRemove }: Props) {
  return (
    <div
      className="flex items-center gap-3 rounded-md border p-3"
      data-testid="draft-item-card"
    >
      {item.productPhoto ? (
        <Image
          src={item.productPhoto}
          alt={item.productName}
          width={56}
          height={56}
          className="size-14 rounded object-cover"
        />
      ) : (
        <div className="size-14 rounded bg-muted" />
      )}
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium">{item.productName}</p>
        {item.variantName && (
          <p className="text-xs text-muted-foreground">{item.variantName}</p>
        )}
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <CalendarDays className="size-3" />
          {formatAdminDate(item.date)}
        </div>
      </div>
      <div className="text-right text-sm">
        <p className="font-medium">
          {formatAdminCurrency(item.unitPrice * item.quantity)}
        </p>
        <p className="text-xs text-muted-foreground">
          {item.quantity} × {formatAdminCurrency(item.unitPrice)}
        </p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => onRemove(item.draftId)}
        aria-label="Eliminar ítem"
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}
