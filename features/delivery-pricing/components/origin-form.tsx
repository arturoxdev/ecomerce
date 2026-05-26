"use client";

import { useActionState, useState } from "react";

import { Field } from "@/components/admin/field";
import {
  PlaceAutocomplete,
  type SelectedPlace,
} from "@/components/maps/place-autocomplete";
import { Button } from "@/components/ui/button";
import {
  getFieldErrors,
  isFormError,
  type FormState,
} from "@/lib/types/form-state";

type Props = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  defaultValues: { address: string; lat: number | null; lng: number | null };
};

export function OriginForm({ action, defaultValues }: Props) {
  const [state, formAction, pending] = useActionState(action, {} as FormState);
  const fieldErrors = getFieldErrors(state);
  const success = !isFormError(state) && "success" in state;

  const [addressText, setAddressText] = useState(defaultValues.address);
  const [place, setPlace] = useState<SelectedPlace | null>(
    defaultValues.lat !== null && defaultValues.lng !== null
      ? {
          formattedAddress: defaultValues.address,
          lat: defaultValues.lat,
          lng: defaultValues.lng,
        }
      : null,
  );

  const placeIsCurrent =
    !!place && addressText.trim() === place.formattedAddress.trim();

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-4">
      {isFormError(state) && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.detail ?? state.title}
        </p>
      )}
      {success && (
        <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
          Origen guardado.
        </p>
      )}

      <input
        type="hidden"
        name="originAddress"
        value={placeIsCurrent && place ? place.formattedAddress : ""}
      />
      <input
        type="hidden"
        name="originLat"
        value={placeIsCurrent && place ? String(place.lat) : ""}
      />
      <input
        type="hidden"
        name="originLng"
        value={placeIsCurrent && place ? String(place.lng) : ""}
      />

      <Field
        label="Dirección de origen"
        error={fieldErrors?.address?.[0] ?? fieldErrors?.lat?.[0]}
      >
        <PlaceAutocomplete
          value={addressText}
          onValueChange={setAddressText}
          onPlaceSelected={(p) => {
            setPlace(p);
            setAddressText(p.formattedAddress);
          }}
          placeholder="Busca tu dirección de operación…"
        />
        {addressText.trim() !== "" && !placeIsCurrent && (
          <p className="text-xs text-amber-600">
            Selecciona una sugerencia para fijar las coordenadas.
          </p>
        )}
      </Field>

      <div className="flex gap-3 pt-1">
        <Button type="submit" disabled={pending || !placeIsCurrent}>
          {pending ? "Guardando…" : "Guardar origen"}
        </Button>
      </div>
    </form>
  );
}
