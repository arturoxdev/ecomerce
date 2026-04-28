"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export type PaymentValue = {
  paymentMethod: "CASH" | "TRANSFER";
  amountPaid: number;
};

type Props = {
  value: PaymentValue;
  total: number;
  onChange: (value: PaymentValue) => void;
};

export function PaymentBox({ value, total, onChange }: Props) {
  const overpaid = value.amountPaid > total;

  return (
    <div className="space-y-3 rounded-md border p-4">
      <div>
        <Label className="text-sm font-medium">Método de pago</Label>
        <RadioGroup
          value={value.paymentMethod}
          onValueChange={(method) =>
            onChange({
              ...value,
              paymentMethod: method as "CASH" | "TRANSFER",
            })
          }
          className="mt-2 flex gap-4"
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem value="CASH" id="payment-cash" />
            <Label htmlFor="payment-cash" className="font-normal">
              Efectivo
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="TRANSFER" id="payment-transfer" />
            <Label htmlFor="payment-transfer" className="font-normal">
              Transferencia
            </Label>
          </div>
        </RadioGroup>
      </div>

      <div>
        <Label htmlFor="amountPaid" className="text-sm font-medium">
          Adelanto
        </Label>
        <Input
          id="amountPaid"
          type="number"
          step="0.01"
          min={0}
          value={Number.isFinite(value.amountPaid) ? value.amountPaid : 0}
          onChange={(e) =>
            onChange({
              ...value,
              amountPaid: Number(e.target.value) || 0,
            })
          }
          className="mt-1"
          aria-invalid={overpaid || undefined}
        />
        {overpaid && (
          <p className="mt-1 text-xs text-red-600">
            El adelanto no puede exceder el total (${total.toFixed(2)}).
          </p>
        )}
      </div>
    </div>
  );
}
