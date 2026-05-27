"use client";

import { Check } from "lucide-react";
import { useActionState, useEffect, useRef } from "react";

import { Field } from "@/components/admin/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  getFieldErrors,
  isFormError,
  type FormState,
} from "@/lib/types/form-state";

type Props = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  defaultValues?: {
    name: string;
    price: number;
    description: string | null;
    isActive: boolean;
    sortOrder: number;
  };
  submitLabel: string;
  onSuccess?: () => void;
  onCancel?: () => void;
};

export function ServiceForm({
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
      className="flex flex-col gap-3"
    >
      {isFormError(state) && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
          {state.detail ?? state.title}
        </p>
      )}
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Nombre" error={fieldErrors?.name?.[0]}>
          <Input
            type="text"
            name="name"
            defaultValue={defaultValues?.name ?? ""}
            className="w-56"
            maxLength={120}
            required
          />
        </Field>
        <Field label="Precio ($)" error={fieldErrors?.price?.[0]}>
          <Input
            type="number"
            name="price"
            step="0.01"
            min="0"
            defaultValue={defaultValues?.price ?? ""}
            className="w-28"
            required
          />
        </Field>
        <Field label="Orden" error={fieldErrors?.sortOrder?.[0]}>
          <Input
            type="number"
            name="sortOrder"
            step="1"
            min="0"
            defaultValue={defaultValues?.sortOrder ?? 0}
            className="w-24"
          />
        </Field>
      </div>
      <Field label="Descripción" error={fieldErrors?.description?.[0]}>
        <Textarea
          name="description"
          defaultValue={defaultValues?.description ?? ""}
          className="max-w-xl"
          maxLength={500}
          rows={2}
        />
      </Field>
      <label
        htmlFor={`isActive-${defaultValues?.name ?? "new"}`}
        className="flex cursor-pointer items-center gap-2.5"
      >
        <input
          id={`isActive-${defaultValues?.name ?? "new"}`}
          name="isActive"
          type="checkbox"
          value="true"
          defaultChecked={defaultValues?.isActive ?? true}
          className="peer sr-only"
        />
        <span
          aria-hidden
          className="grid size-[18px] shrink-0 place-items-center rounded-[4px] border border-border bg-background transition-colors peer-checked:border-secondary peer-checked:bg-secondary peer-checked:text-secondary-foreground peer-checked:[&>svg]:opacity-100 peer-focus-visible:ring-2 peer-focus-visible:ring-ring/50"
        >
          <Check className="size-3 opacity-0" strokeWidth={3} />
        </span>
        <span className="text-[13px] font-semibold text-foreground">
          Activo
        </span>
      </label>
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
