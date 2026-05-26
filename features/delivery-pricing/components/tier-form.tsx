"use client";

import { useActionState, useEffect, useRef } from "react";

import { Field } from "@/components/admin/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getFieldErrors,
  isFormError,
  type FormState,
} from "@/lib/types/form-state";

type Props = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  defaultValues?: { minMiles: number; maxMiles: number; fee: number };
  submitLabel: string;
  onSuccess?: () => void;
  onCancel?: () => void;
};

export function TierForm({
  action,
  defaultValues,
  submitLabel,
  onSuccess,
  onCancel,
}: Props) {
  const [state, formAction, pending] = useActionState(action, {} as FormState);
  const fieldErrors = getFieldErrors(state);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!isFormError(state) && "success" in state) {
      formRef.current?.reset();
      onSuccess?.();
    }
    // Only react to a new action result.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex flex-wrap items-end gap-3"
    >
      {isFormError(state) && (
        <p className="w-full rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
          {state.detail ?? state.title}
        </p>
      )}
      <Field label="Desde (mi)" error={fieldErrors?.minMiles?.[0]}>
        <Input
          type="number"
          name="minMiles"
          step="0.01"
          min="0"
          defaultValue={defaultValues?.minMiles ?? ""}
          className="w-28"
          required
        />
      </Field>
      <Field label="Hasta (mi)" error={fieldErrors?.maxMiles?.[0]}>
        <Input
          type="number"
          name="maxMiles"
          step="0.01"
          min="0"
          defaultValue={defaultValues?.maxMiles ?? ""}
          className="w-28"
          required
        />
      </Field>
      <Field label="Tarifa ($)" error={fieldErrors?.fee?.[0]}>
        <Input
          type="number"
          name="fee"
          step="0.01"
          min="0"
          defaultValue={defaultValues?.fee ?? ""}
          className="w-28"
          required
        />
      </Field>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Guardando…" : submitLabel}
        </Button>
        {onCancel && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onCancel}
            disabled={pending}
          >
            Cancelar
          </Button>
        )}
      </div>
    </form>
  );
}
