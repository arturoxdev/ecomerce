"use client";

import { useActionState, useState } from "react";

import {
  ContentLocaleSwitch,
  type ContentLocale,
} from "@/components/admin/content-locale-switch";
import { Field } from "@/components/admin/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSlugField } from "@/hooks/use-slug-field";
import { cn } from "@/lib/utils";

import { isFormError, getFieldErrors, type FormState } from "@/lib/types/form-state";

type Props = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  defaultValues?: {
    name?: string;
    slug?: string;
    description?: string;
    nameEn?: string;
    descriptionEn?: string;
  };
};

const FIELD_CLASS = "flex flex-col gap-1.5";
const TEXTAREA_CLASS =
  "min-h-[250px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

export function CategoryForm({ action, defaultValues }: Props) {
  const [state, formAction, pending] = useActionState(action, {} as FormState);
  const fieldErrors = getFieldErrors(state);
  const { name, slug, handleNameChange, handleSlugChange, handleSlugBlur } = useSlugField(
    defaultValues?.name,
    defaultValues?.slug,
  );
  // ADR-015: the switch only swaps which language is visible. Both languages
  // stay mounted, so one "Guardar" submits Spanish and English together.
  const [contentLocale, setContentLocale] = useState<ContentLocale>("es");

  const localeErrors = {
    es: Boolean(fieldErrors?.name || fieldErrors?.description),
    en: Boolean(fieldErrors?.nameEn || fieldErrors?.descriptionEn),
  };

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {isFormError(state) && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.detail ?? state.title}
        </p>
      )}

      <div className="flex justify-end">
        <ContentLocaleSwitch
          value={contentLocale}
          onChange={setContentLocale}
          errors={localeErrors}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Nombre"
          error={fieldErrors?.name?.[0]}
          className={cn(FIELD_CLASS, contentLocale !== "es" && "hidden")}
        >
          <Input
            name="name"
            value={name}
            onChange={handleNameChange}
            required
            // The Spanish name is required; if it is empty while the English
            // copy is showing, reveal it so the browser's validation message
            // has somewhere to land.
            onInvalid={() => setContentLocale("es")}
          />
        </Field>
        <Field
          label="Nombre (inglés)"
          error={fieldErrors?.nameEn?.[0]}
          className={cn(FIELD_CLASS, contentLocale !== "en" && "hidden")}
        >
          <Input
            name="nameEn"
            defaultValue={defaultValues?.nameEn}
            placeholder={name || "Category name"}
          />
        </Field>

        <Field label="Slug" error={fieldErrors?.slug?.[0]}>
          <Input name="slug" value={slug} onChange={handleSlugChange} onBlur={handleSlugBlur} required />
        </Field>
      </div>

      <Field
        label="Descripción"
        error={fieldErrors?.description?.[0]}
        className={cn(FIELD_CLASS, contentLocale !== "es" && "hidden")}
      >
        <textarea
          name="description"
          defaultValue={defaultValues?.description}
          className={TEXTAREA_CLASS}
        />
      </Field>
      <Field
        label="Descripción (inglés)"
        error={fieldErrors?.descriptionEn?.[0]}
        className={cn(FIELD_CLASS, contentLocale !== "en" && "hidden")}
      >
        <textarea
          name="descriptionEn"
          defaultValue={defaultValues?.descriptionEn}
          className={TEXTAREA_CLASS}
        />
      </Field>
      {contentLocale === "en" && (
        <p className="text-xs text-muted-foreground">
          La traducción es opcional: lo que quede vacío se muestra en español
          en la tienda.
        </p>
      )}

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : "Guardar categoría"}
        </Button>
        <Button type="button" variant="outline" onClick={() => history.back()}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
