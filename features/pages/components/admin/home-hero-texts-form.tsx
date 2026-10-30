"use client";

import { useActionState } from "react";

import { Field } from "@/components/admin/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFormActionToast } from "@/hooks/use-form-action-toast";

import { getFieldErrors, type FormState as StaticPageFormState } from "@/lib/types/form-state";

type Props = {
  action: (prev: StaticPageFormState, formData: FormData) => Promise<StaticPageFormState>;
  defaultValues: {
    titleStart: string;
    titleHighlight: string;
    description: string;
  };
  canWrite: boolean;
};

export function HomeHeroTextsForm({ action, defaultValues, canWrite }: Props) {
  const [state, formAction, pending] = useActionState(action, {} as StaticPageFormState);
  const fieldErrors = getFieldErrors(state);
  useFormActionToast(state, "Textos del hero actualizados");

  return (
    <form action={formAction} className="space-y-6">
      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Título" error={fieldErrors?.titleStart?.[0]} className="space-y-2">
          <Input name="titleStart" defaultValue={defaultValues.titleStart} disabled={!canWrite} />
        </Field>
        <Field
          label="Palabra resaltada (opcional)"
          error={fieldErrors?.titleHighlight?.[0]}
          className="space-y-2"
        >
          <Input
            name="titleHighlight"
            defaultValue={defaultValues.titleHighlight}
            disabled={!canWrite}
          />
        </Field>
      </div>
      <p className="-mt-3 text-xs text-slate-500">
        La palabra resaltada se muestra al final del título, en color y subrayada.
      </p>

      <Field label="Subtítulo" error={fieldErrors?.description?.[0]} className="space-y-2">
        <textarea
          name="description"
          defaultValue={defaultValues.description}
          rows={3}
          disabled={!canWrite}
          className="w-full rounded-xl border border-[#e2e8f0] px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-primary disabled:bg-slate-50"
        />
      </Field>

      {canWrite ? (
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={pending}
            className="h-10 rounded-xl bg-secondary px-5 text-white hover:bg-green-800"
          >
            {pending ? "Guardando..." : "Guardar textos"}
          </Button>
        </div>
      ) : null}
    </form>
  );
}
