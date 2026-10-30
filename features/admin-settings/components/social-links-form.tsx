"use client";

import { useActionState } from "react";

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
  defaultValues: {
    facebookUrl: string | null;
    instagramUrl: string | null;
  };
};

export function SocialLinksForm({ action, defaultValues }: Props) {
  const [state, formAction, pending] = useActionState(action, {} as FormState);
  const fieldErrors = getFieldErrors(state);
  const success = !isFormError(state) && "success" in state;

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-5">
      {isFormError(state) && !fieldErrors && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.detail ?? state.title}
        </p>
      )}
      {success && (
        <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
          Redes sociales guardadas.
        </p>
      )}

      <Field label="Facebook" error={fieldErrors?.facebookUrl?.[0]}>
        <Input
          name="facebookUrl"
          type="url"
          inputMode="url"
          placeholder="https://facebook.com/tu-pagina"
          defaultValue={defaultValues.facebookUrl ?? ""}
          aria-invalid={!!fieldErrors?.facebookUrl}
        />
      </Field>

      <Field label="Instagram" error={fieldErrors?.instagramUrl?.[0]}>
        <Input
          name="instagramUrl"
          type="url"
          inputMode="url"
          placeholder="https://instagram.com/tu-cuenta"
          defaultValue={defaultValues.instagramUrl ?? ""}
          aria-invalid={!!fieldErrors?.instagramUrl}
        />
      </Field>

      <p className="text-xs text-muted-foreground">
        Deja un campo vacío para ocultar ese ícono en el footer del sitio.
      </p>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : "Guardar redes sociales"}
        </Button>
      </div>
    </form>
  );
}
