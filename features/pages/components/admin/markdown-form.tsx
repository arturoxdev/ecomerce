"use client";

import { useActionState, useState } from "react";

import { Field } from "@/components/admin/field";
import { MarkdownEditor } from "@/components/admin/markdown-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFormActionToast } from "@/hooks/use-form-action-toast";

import { getFieldErrors, type FormState as StaticPageFormState } from "@/lib/types/form-state";

type Props = {
  action: (prev: StaticPageFormState, formData: FormData) => Promise<StaticPageFormState>;
  defaultValues: {
    title: string;
    subtitle: string;
    body: string;
  };
  canWrite: boolean;
};

export function MarkdownForm({ action, defaultValues, canWrite }: Props) {
  const [state, formAction, pending] = useActionState(action, {} as StaticPageFormState);
  const fieldErrors = getFieldErrors(state);
  const [body, setBody] = useState(defaultValues.body);
  useFormActionToast(state, "Documento actualizado");

  return (
    <form action={formAction} className="space-y-6">
      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Título" error={fieldErrors?.title?.[0]} className="space-y-2">
          <Input name="title" defaultValue={defaultValues.title} disabled={!canWrite} />
        </Field>
        <Field label="Subtítulo" error={fieldErrors?.subtitle?.[0]} className="space-y-2">
          <Input
            name="subtitle"
            defaultValue={defaultValues.subtitle}
            disabled={!canWrite}
          />
        </Field>
      </div>

      <Field label="Contenido Markdown" error={fieldErrors?.body?.[0]} className="space-y-2">
        <MarkdownEditor
          value={body}
          onChange={setBody}
          name="body"
          readOnly={!canWrite}
        />
      </Field>

      {canWrite ? (
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={pending}
            className="h-10 rounded-xl bg-secondary px-5 text-white hover:bg-green-800"
          >
            {pending ? "Guardando..." : "Guardar cambios"}
          </Button>
        </div>
      ) : null}
    </form>
  );
}
