"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type ContentLocale = "es" | "en";

const OPTIONS: { value: ContentLocale; label: string; title: string }[] = [
  { value: "es", label: "ES", title: "Español" },
  { value: "en", label: "EN", title: "English" },
];

type Props = {
  value: ContentLocale;
  onChange: (value: ContentLocale) => void;
  /** Locales that currently hold a validation error (shows a red dot). */
  errors?: Partial<Record<ContentLocale, boolean>>;
};

/**
 * ES | EN selector for the translatable product copy (ADR-013). It only swaps
 * which language's fields are visible — both languages stay mounted and are
 * submitted together by the surrounding form.
 */
export function ContentLocaleSwitch({ value, onChange, errors }: Props) {
  return (
    <Tabs
      value={value}
      onValueChange={(next) => onChange(next as ContentLocale)}
      aria-label="Idioma del contenido"
    >
      <TabsList>
        {OPTIONS.map((option) => (
          <TabsTrigger
            key={option.value}
            value={option.value}
            title={option.title}
            className="px-3"
          >
            {option.label}
            {errors?.[option.value] && (
              <span
                aria-label="Tiene errores"
                className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-destructive"
              />
            )}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
