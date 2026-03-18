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
    eyebrow: string;
    title: string;
    subtitle: string;
    storyTitle: string;
    storyBody: string;
    valuesTitle: string;
    valuesBody: string;
  };
  canWrite: boolean;
};

export function AboutForm({ action, defaultValues, canWrite }: Props) {
  const [state, formAction, pending] = useActionState(action, {});

  useEffect(() => {
    if (state.success) {
      toast.success("About page updated");
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state]);

  return (
    <form action={formAction} className="space-y-6">
      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Eyebrow" error={state.fieldErrors?.eyebrow?.[0]}>
          <Input name="eyebrow" defaultValue={defaultValues.eyebrow} disabled={!canWrite} />
        </Field>
        <Field label="Title" error={state.fieldErrors?.title?.[0]}>
          <Input name="title" defaultValue={defaultValues.title} disabled={!canWrite} />
        </Field>
      </div>

      <Field label="Subtitle" error={state.fieldErrors?.subtitle?.[0]}>
        <textarea
          name="subtitle"
          defaultValue={defaultValues.subtitle}
          rows={4}
          disabled={!canWrite}
          className="w-full rounded-xl border border-[#e2e8f0] px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-primary disabled:bg-slate-50"
        />
      </Field>

      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Story title" error={state.fieldErrors?.storyTitle?.[0]}>
          <Input
            name="storyTitle"
            defaultValue={defaultValues.storyTitle}
            disabled={!canWrite}
          />
        </Field>
        <Field label="Values title" error={state.fieldErrors?.valuesTitle?.[0]}>
          <Input
            name="valuesTitle"
            defaultValue={defaultValues.valuesTitle}
            disabled={!canWrite}
          />
        </Field>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Story body" error={state.fieldErrors?.storyBody?.[0]}>
          <textarea
            name="storyBody"
            defaultValue={defaultValues.storyBody}
            rows={8}
            disabled={!canWrite}
            className="w-full rounded-xl border border-[#e2e8f0] px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-primary disabled:bg-slate-50"
          />
        </Field>
        <Field label="Values body" error={state.fieldErrors?.valuesBody?.[0]}>
          <textarea
            name="valuesBody"
            defaultValue={defaultValues.valuesBody}
            rows={8}
            disabled={!canWrite}
            className="w-full rounded-xl border border-[#e2e8f0] px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-primary disabled:bg-slate-50"
          />
        </Field>
      </div>

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
