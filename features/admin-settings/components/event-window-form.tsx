"use client";

import { useActionState, useState } from "react";

import { Field } from "@/components/admin/field";
import { Button } from "@/components/ui/button";
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

const ALL_HOURS = Array.from({ length: 24 }, (_, i) =>
  `${String(i).padStart(2, "0")}:00`,
);

type Props = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  defaultValues: {
    eventWindowStart: string | null;
    eventWindowEnd: string | null;
  };
};

export function EventWindowForm({ action, defaultValues }: Props) {
  const [state, formAction, pending] = useActionState(action, {} as FormState);
  const fieldErrors = getFieldErrors(state);
  const [start, setStart] = useState<string>(
    defaultValues.eventWindowStart ?? "",
  );
  const [end, setEnd] = useState<string>(defaultValues.eventWindowEnd ?? "");
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
          Horario de eventos guardado.
        </p>
      )}

      <input type="hidden" name="eventWindowStart" value={start} />
      <input type="hidden" name="eventWindowEnd" value={end} />

      <Field
        label="Hora de inicio (primera hora permitida)"
        error={fieldErrors?.eventWindowStart?.[0]}
      >
        <Select
          value={start}
          onValueChange={(v) => setStart(v == null || v === "none" ? "" : v)}
        >
          <SelectTrigger className="w-full">
            {start ? start : "Sin configurar"}
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Sin configurar</SelectItem>
            {ALL_HOURS.map((h) => (
              <SelectItem key={h} value={h}>
                {h}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field
        label="Hora de fin (última hora permitida)"
        error={fieldErrors?.eventWindowEnd?.[0]}
      >
        <Select
          value={end}
          onValueChange={(v) => setEnd(v == null || v === "none" ? "" : v)}
        >
          <SelectTrigger className="w-full">
            {end ? end : "Sin configurar"}
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Sin configurar</SelectItem>
            {ALL_HOURS.map((h) => (
              <SelectItem key={h} value={h}>
                {h}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <p className="text-xs text-muted-foreground">
        Deja ambos en &ldquo;Sin configurar&rdquo; para deshabilitar el horario
        de eventos. Si configuras uno, el otro también es obligatorio y la hora
        de fin debe ser igual o posterior a la de inicio.
      </p>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : "Guardar horario"}
        </Button>
      </div>
    </form>
  );
}
