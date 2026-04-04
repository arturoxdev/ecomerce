"use client";

import { useActionState } from "react";

import { Field } from "@/components/admin/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSlugField } from "@/hooks/use-slug-field";

import type { CategoryFormState } from "./actions";

type Props = {
  action: (prev: CategoryFormState, formData: FormData) => Promise<CategoryFormState>;
  defaultValues?: {
    name?: string;
    slug?: string;
    description?: string;
  };
};

export function CategoryForm({ action, defaultValues }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const { name, slug, handleNameChange, handleSlugChange } = useSlugField(
    defaultValues?.name,
    defaultValues?.slug,
  );

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Name" error={state.fieldErrors?.name?.[0]}>
          <Input name="name" value={name} onChange={handleNameChange} required />
        </Field>

        <Field label="Slug" error={state.fieldErrors?.slug?.[0]}>
          <Input name="slug" value={slug} onChange={handleSlugChange} required />
        </Field>
      </div>

      <Field label="Description" error={state.fieldErrors?.description?.[0]}>
        <textarea
          name="description"
          defaultValue={defaultValues?.description}
          rows={3}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
      </Field>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save category"}
        </Button>
        <Button type="button" variant="outline" onClick={() => history.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
