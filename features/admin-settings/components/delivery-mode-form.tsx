"use client";

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

type DeliveryMode = "INCLUDED" | "FIXED_FEE" | "ZIP_CODE" | "DISTANCE_MILES";

const DELIVERY_LABELS: Record<DeliveryMode, string> = {
  INCLUDED: "Gratis (incluida)",
  FIXED_FEE: "Tarifa fija",
  ZIP_CODE: "Por código postal",
  DISTANCE_MILES: "Por distancia (millas)",
};

type Props = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  defaultValues: {
    deliveryMode: DeliveryMode;
    deliveryFee?: string | null;
  };
  hasZipcodes: boolean;
  hasOrigin: boolean;
  hasTiers: boolean;
};

export function DeliveryModeForm({
  action,
  defaultValues,
  hasZipcodes,
  hasOrigin,
  hasTiers,
}: Props) {
  const [state, formAction, pending] = useActionState(action, {} as FormState);
  const fieldErrors = getFieldErrors(state);
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>(
    defaultValues.deliveryMode,
  );
  const success = !isFormError(state) && "success" in state;
  const distanceReady = hasOrigin && hasTiers;

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-5">
      {isFormError(state) && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.detail ?? state.title}
        </p>
      )}
      {success && (
        <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
          Modo de entrega guardado.
        </p>
      )}

      <Field label="Modo de entrega" error={fieldErrors?.deliveryMode?.[0]}>
        <input type="hidden" name="deliveryMode" value={deliveryMode} />
        <Select
          value={deliveryMode}
          onValueChange={(v) => {
            const next = (v ?? "INCLUDED") as DeliveryMode;
            if (next === "ZIP_CODE" && !hasZipcodes) return;
            if (next === "DISTANCE_MILES" && !distanceReady) return;
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
            <SelectItem value="DISTANCE_MILES" disabled={!distanceReady}>
              {DELIVERY_LABELS.DISTANCE_MILES}
              {!distanceReady && " — configura origen y tramos primero"}
            </SelectItem>
          </SelectContent>
        </Select>
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

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : "Guardar modo de entrega"}
        </Button>
      </div>
    </form>
  );
}
