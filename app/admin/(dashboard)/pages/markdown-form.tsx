"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import type { StaticPageFormState } from "./actions";

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
  const [state, formAction, pending] = useActionState(action, {});

  useEffect(() => {
    if (state.success) {
      toast.success("Document updated");
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state]);

  return (
    <form action={formAction} className="space-y-6">
      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Title" error={state.fieldErrors?.title?.[0]}>
          <Input name="title" defaultValue={defaultValues.title} disabled={!canWrite} />
        </Field>
        <Field label="Subtitle" error={state.fieldErrors?.subtitle?.[0]}>
          <Input
            name="subtitle"
            defaultValue={defaultValues.subtitle}
            disabled={!canWrite}
          />
        </Field>
      </div>

      <Field label="Markdown content" error={state.fieldErrors?.body?.[0]}>
        <textarea
          name="body"
          defaultValue={defaultValues.body}
          rows={18}
          disabled={!canWrite}
          className="w-full rounded-xl border border-[#e2e8f0] px-4 py-3 font-mono text-sm text-slate-700 outline-none transition focus:border-primary disabled:bg-slate-50"
        />
      </Field>

      {canWrite ? (
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={pending}
            className="h-10 rounded-xl bg-secondary px-5 text-white hover:bg-green-800"
          >
            {pending ? "Saving..." : "Save changes"}
          </Button>
        </div>
      ) : null}
    </form>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-semibold text-slate-700">{label}</Label>
      {children}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
