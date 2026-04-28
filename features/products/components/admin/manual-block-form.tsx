"use client";

import { useActionState } from "react";
import { toast } from "sonner";
import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { isFormError, getFieldErrors, type FormState } from "@/lib/types/form-state";
import { createManualBlock } from "../../actions";

type ManualBlockFormState = FormState;

type Props = {
  productId: string;
};

export function ManualBlockForm({ productId }: Props) {
  const boundAction = createManualBlock.bind(null, productId);
  const [state, formAction, isPending] = useActionState<ManualBlockFormState, FormData>(
    boundAction,
    {} as ManualBlockFormState,
  );
  const fieldErrors = getFieldErrors(state);

  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if ("success" in state && state.success) {
      toast.success("Bloqueo creado");
      formRef.current?.reset();
    }
    if (isFormError(state)) {
      toast.error(state.detail ?? state.title);
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label htmlFor="date">Fecha</Label>
        <Input id="date" name="date" type="date" required />
        {fieldErrors?.date && (
          <p className="text-sm text-red-600">{fieldErrors.date[0]}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="reason">Motivo (opcional)</Label>
        <Input id="reason" name="reason" type="text" maxLength={255} />
        {fieldErrors?.reason && (
          <p className="text-sm text-red-600">{fieldErrors.reason[0]}</p>
        )}
      </div>

      <div className="sm:col-span-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Creando…" : "Crear bloqueo"}
        </Button>
      </div>
    </form>
  );
}
