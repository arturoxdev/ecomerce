"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { isFormError, getFieldErrors, type FormState } from "@/lib/types/form-state";
import { createManualBlock } from "../../actions";

type ManualBlockFormState = FormState;

type Props = {
  productId: string;
  /** Active variants. When present, a block must target one (ADR-014). */
  variants?: Array<{ id: string; name: string; stock: number }>;
};

export function ManualBlockForm({ productId, variants = [] }: Props) {
  const [blockAll, setBlockAll] = useState(false);
  const [state, formAction, isPending] = useActionState<ManualBlockFormState, FormData>(
    async (prev, formData) => {
      const result = await createManualBlock(productId, prev, formData);
      // The checkbox is controlled, so the native form reset does not clear it.
      if ("success" in result && result.success) setBlockAll(false);
      return result;
    },
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

      {variants.length > 0 && (
        <div className="space-y-1.5">
          <Label htmlFor="variantId">Variante</Label>
          <Select
            name="variantId"
            required
            items={variants.map((v) => ({ value: v.id, label: v.name }))}
          >
            <SelectTrigger id="variantId">
              <SelectValue placeholder="Selecciona variante" />
            </SelectTrigger>
            <SelectContent>
              {variants.map((v) => (
                <SelectItem key={v.id} value={v.id} label={v.name}>
                  {v.name} ({v.stock})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {fieldErrors?.variantId && (
            <p className="text-sm text-red-600">{fieldErrors.variantId[0]}</p>
          )}
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="quantity">Unidades a bloquear</Label>
        <Input
          id="quantity"
          name="quantity"
          type="number"
          min="1"
          defaultValue="1"
          disabled={blockAll}
          required={!blockAll}
          className="font-mono"
        />
        <div className="flex items-center gap-2 pt-1">
          <Checkbox
            id="blockAll"
            name="blockAll"
            checked={blockAll}
            onCheckedChange={(checked) => setBlockAll(checked === true)}
          />
          <Label htmlFor="blockAll" className="font-normal">
            Bloquear todas las unidades libres ese día
          </Label>
        </div>
        {fieldErrors?.quantity && (
          <p className="text-sm text-red-600">{fieldErrors.quantity[0]}</p>
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
