"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import type { Theme } from "@/lib/themes";

import { updateTheme } from "../../actions";

const SWATCH_KEYS = [
  "--primary",
  "--background",
  "--accent",
  "--destructive",
] as const;

type Props = {
  themes: Theme[];
  current: string;
};

export function ThemeGrid({ themes, current }: Props) {
  const [selected, setSelected] = useState(current);
  const [isPending, startTransition] = useTransition();

  const dirty = selected !== current;

  async function onSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await updateTheme(formData);
      if (result && "success" in result) {
        toast.success("Tema actualizado");
      } else if (result && "title" in result) {
        toast.error(result.title, { description: result.detail });
      }
    });
  }

  return (
    <form action={onSubmit} className="space-y-6">
      <RadioGroup
        value={selected}
        onValueChange={(value) => setSelected(value as string)}
        name="themeId"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {themes.map((theme) => {
          const isSelected = selected === theme.id;
          return (
            <label
              key={theme.id}
              htmlFor={`theme-${theme.id}`}
              className="cursor-pointer"
              data-testid={`theme-option-${theme.id}`}
            >
              <Card
                className={cn(
                  "relative gap-3 p-4 transition-all",
                  isSelected
                    ? "border-primary ring-2 ring-primary/40"
                    : "hover:border-muted-foreground/40",
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{theme.name}</span>
                  <RadioGroupItem
                    value={theme.id}
                    id={`theme-${theme.id}`}
                  />
                </div>
                <div className="flex gap-2">
                  {SWATCH_KEYS.map((key) => (
                    <div
                      key={key}
                      className="size-8 flex-1 rounded-md border"
                      style={{ background: theme.vars[key] }}
                      aria-hidden
                    />
                  ))}
                </div>
              </Card>
            </label>
          );
        })}
      </RadioGroup>

      <div className="flex justify-end">
        <Button type="submit" disabled={!dirty || isPending}>
          {isPending ? "Guardando..." : "Guardar"}
        </Button>
      </div>
    </form>
  );
}
