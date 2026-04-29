"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { Field } from "@/components/admin/field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  getFieldErrors,
  isFormError,
  type FormState,
} from "@/lib/types/form-state";

import { createZipcode, updateZipcode } from "../../actions";

type ZipcodeRow = {
  id: string;
  city: string;
  zipCode: string;
  fee: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: ZipcodeRow | null;
  onSaved?: () => void;
};

export function ZipcodeFormDialog({
  open,
  onOpenChange,
  initial,
  onSaved,
}: Props) {
  const isEdit = Boolean(initial);
  const action = isEdit
    ? (prev: FormState, formData: FormData) =>
        updateZipcode(initial!.id, prev, formData)
    : createZipcode;

  const [state, formAction, pending] = useActionState(action, {} as FormState);

  const fieldErrors = getFieldErrors(state);

  useEffect(() => {
    if (!isFormError(state) && "success" in state) {
      toast.success(isEdit ? "Zipcode actualizado" : "Zipcode creado");
      onSaved?.();
      onOpenChange(false);
    }
  }, [state, isEdit, onOpenChange, onSaved]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar zipcode" : "Crear zipcode"}
          </DialogTitle>
          <DialogDescription>
            Ingresa el código postal y la tarifa de delivery asociada.
          </DialogDescription>
        </DialogHeader>

        <form
          key={initial?.id ?? "new"}
          action={formAction}
          className="flex flex-col gap-4"
        >
          {isFormError(state) && !fieldErrors && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {state.detail ?? state.title}
            </p>
          )}

          <Field label="Ciudad" error={fieldErrors?.city?.[0]}>
            <Input
              name="city"
              maxLength={80}
              autoComplete="off"
              required
              defaultValue={initial?.city ?? ""}
              placeholder="Ej. Denver"
            />
          </Field>

          <Field label="Zipcode" error={fieldErrors?.zipcode?.[0]}>
            <Input
              name="zipcode"
              maxLength={8}
              autoComplete="off"
              required
              defaultValue={initial?.zipCode ?? ""}
              placeholder="Ej. 80202"
            />
          </Field>

          <Field label="Tarifa de delivery" error={fieldErrors?.fee?.[0]}>
            <Input
              name="fee"
              type="number"
              step="0.01"
              min="0"
              required
              defaultValue={initial?.fee ?? ""}
              placeholder="0.00"
            />
          </Field>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Guardando…" : isEdit ? "Guardar" : "Crear"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
