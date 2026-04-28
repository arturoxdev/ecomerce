"use client";

import { Separator } from "@/components/ui/separator";

type SummaryItem = {
  unitPrice: number;
  quantity: number;
};

type Props = {
  items: SummaryItem[];
  amountPaid: number;
};

export function Summary({ items, amountPaid }: Props) {
  const subtotal = items.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0,
  );
  const total = subtotal;
  const balance = Math.max(0, total - amountPaid);

  return (
    <div className="space-y-2 rounded-md border p-4 text-sm">
      <div className="flex justify-between">
        <span className="text-muted-foreground">Subtotal</span>
        <span>${subtotal.toFixed(2)}</span>
      </div>
      <Separator />
      <div className="flex justify-between font-semibold">
        <span>Total</span>
        <span>${total.toFixed(2)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Pagado</span>
        <span>${amountPaid.toFixed(2)}</span>
      </div>
      {balance > 0 && (
        <div className="flex justify-between">
          <span className="text-muted-foreground">Saldo</span>
          <span className="font-medium">${balance.toFixed(2)}</span>
        </div>
      )}
    </div>
  );
}
