"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { Field } from "@/components/admin/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  getFieldErrors,
  isFormError,
  type FormState,
} from "@/lib/types/form-state";

type DeliveryMode = "INCLUDED" | "FIXED_FEE" | "ZIP_CODE";

const DELIVERY_LABELS: Record<DeliveryMode, string> = {
  INCLUDED: "Gratis (incluida)",
  FIXED_FEE: "Tarifa fija",
  ZIP_CODE: "Por código postal",
};

type Props = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  defaultValues: {
    paymentMode: "SPLIT_50_50" | "FULL_ONLINE";
    deliveryMode: DeliveryMode;
    deliveryFee?: string | null;
    depositPercent: string;
  };
  hasZipcodes: boolean;
};

export function SettingsForm({ action, defaultValues, hasZipcodes }: Props) {
  const [state, formAction, pending] = useActionState(action, {} as FormState);
  const fieldErrors = getFieldErrors(state);
  const [paymentMode, setPaymentMode] = useState(defaultValues.paymentMode);
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>(
    defaultValues.deliveryMode,
  );
  const success = !isFormError(state) && "success" in state;

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-5">
      {isFormError(state) && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.detail ?? state.title}
        </p>
      )}
      {success && (
        <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
          Ajustes guardados.
        </p>
      )}

      <Field label="Modo de pago" error={fieldErrors?.paymentMode?.[0]}>
        <input type="hidden" name="paymentMode" value={paymentMode} />
        <Select
          value={paymentMode}
          onValueChange={(v) =>
            setPaymentMode((v ?? "SPLIT_50_50") as "SPLIT_50_50" | "FULL_ONLINE")
          }
        >
          <SelectTrigger className="w-full">
            {paymentMode === "FULL_ONLINE"
              ? "Pago completo en línea (100%)"
              : "50/50 (50% en línea, 50% al entregar)"}
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="SPLIT_50_50">
              50/50 (50% en línea, 50% al entregar)
            </SelectItem>
            <SelectItem value="FULL_ONLINE">Pago completo en línea (100%)</SelectItem>
          </SelectContent>
        </Select>
      </Field>

      <Field label="Modo de entrega" error={fieldErrors?.deliveryMode?.[0]}>
        <input type="hidden" name="deliveryMode" value={deliveryMode} />
        <Select
          value={deliveryMode}
          onValueChange={(v) => {
            const next = (v ?? "INCLUDED") as DeliveryMode;
            if (next === "ZIP_CODE" && !hasZipcodes) return;
            setDeliveryMode(next);
          }}
        >
          <SelectTrigger className="w-full">
            {DELIVERY_LABELS[deliveryMode]}
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="INCLUDED">{DELIVERY_LABELS.INCLUDED}</SelectItem>
            <SelectItem value="FIXED_FEE">{DELIVERY_LABELS.FIXED_FEE}</SelectItem>
            <SelectItem value="ZIP_CODE" disabled={!hasZipcodes}>
              {DELIVERY_LABELS.ZIP_CODE}
              {!hasZipcodes && " — configura zipcodes primero"}
            </SelectItem>
          </SelectContent>
        </Select>
        {deliveryMode === "ZIP_CODE" && (
          <p className="text-xs text-muted-foreground">
            Administra tu catálogo de zipcodes en{" "}
            <Link
              href="/admin/zipcodes"
              className="font-medium underline underline-offset-2 hover:text-foreground"
            >
              /admin/zipcodes
            </Link>
            .
          </p>
        )}
        {!hasZipcodes && deliveryMode !== "ZIP_CODE" && (
          <p className="text-xs text-muted-foreground">
            Para activar “Por código postal”, primero{" "}
            <Link
              href="/admin/zipcodes"
              className="font-medium underline underline-offset-2 hover:text-foreground"
            >
              registra zipcodes
            </Link>
            .
          </p>
        )}
      </Field>

      {deliveryMode === "FIXED_FEE" && (
        <Field label="Tarifa de entrega" error={fieldErrors?.deliveryFee?.[0]}>
          <Input
            type="number"
            name="deliveryFee"
            step="0.01"
            min="0"
            defaultValue={defaultValues.deliveryFee ?? ""}
            required
          />
        </Field>
      )}

      <Field
        label="Porcentaje de anticipo (0 - 1)"
        error={fieldErrors?.depositPercent?.[0]}
      >
        <Input
          type="number"
          name="depositPercent"
          step="0.01"
          min="0.01"
          max="1"
          defaultValue={defaultValues.depositPercent}
          required
        />
      </Field>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : "Guardar ajustes"}
        </Button>
      </div>
    </form>
  );
}
