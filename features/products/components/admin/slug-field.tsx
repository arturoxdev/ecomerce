"use client";

import { Pencil } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Props = {
  name?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  required?: boolean;
};

export function SlugField({
  name = "slug",
  value,
  onChange,
  error,
  required,
}: Props) {
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <Label htmlFor={id} className="text-xs font-semibold text-foreground">
          Slug
        </Label>
        <span className="rounded bg-warning/15 px-1.5 py-px text-[10.5px] font-semibold tracking-[0.02em] text-warning">
          SEO
        </span>
      </div>

      {editing ? (
        <Input
          id={id}
          ref={inputRef}
          name={name}
          value={value}
          onChange={onChange}
          onBlur={() => setEditing(false)}
          placeholder="product-slug"
          required={required}
          className="font-mono text-[12.5px]"
        />
      ) : (
        <>
          <input type="hidden" name={name} value={value} />
          <div
            className={cn(
              "flex h-9 items-center gap-2 rounded-md border border-dashed border-border-strong bg-muted/40 pr-1.5 pl-3",
              error && "border-destructive/50",
            )}
          >
            <span className="font-mono text-xs text-subtle">/p/</span>
            <span className="flex-1 truncate font-mono text-[12.5px] font-medium text-foreground">
              {value || "product-slug"}
            </span>
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={() => setEditing(true)}
              className="text-[11.5px] font-semibold text-muted-foreground"
            >
              <Pencil data-icon="inline-start" className="size-3" />
              Edit
            </Button>
          </div>
        </>
      )}

      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Changing the slug affects SEO and existing links. Edit only if you know
        what you&apos;re doing.
      </p>

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
