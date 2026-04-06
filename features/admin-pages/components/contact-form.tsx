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
    title: string;
    subtitle: string;
    location: string;
    phone: string;
    email: string;
    businessHours: string;
  };
  canWrite: boolean;
};

export function ContactForm({ action, defaultValues, canWrite }: Props) {
  const [state, formAction, pending] = useActionState(action, {} as StaticPageFormState);
  const fieldErrors = getFieldErrors(state);
  useFormActionToast(state, "Contact page updated");

  return (
    <form action={formAction} className="space-y-6">
      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Title" error={fieldErrors?.title?.[0]} className="space-y-2">
          <Input name="title" defaultValue={defaultValues.title} disabled={!canWrite} />
        </Field>
        <Field label="Email" error={fieldErrors?.email?.[0]} className="space-y-2">
          <Input name="email" defaultValue={defaultValues.email} disabled={!canWrite} />
        </Field>
      </div>

      <Field label="Subtitle" error={fieldErrors?.subtitle?.[0]} className="space-y-2">
        <textarea
          name="subtitle"
          defaultValue={defaultValues.subtitle}
          rows={4}
          disabled={!canWrite}
          className="w-full rounded-xl border border-[#e2e8f0] px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-primary disabled:bg-slate-50"
        />
      </Field>

      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Phone" error={fieldErrors?.phone?.[0]} className="space-y-2">
          <Input name="phone" defaultValue={defaultValues.phone} disabled={!canWrite} />
        </Field>
        <Field
          label="Business hours"
          error={fieldErrors?.businessHours?.[0]}
          className="space-y-2"
        >
          <Input
            name="businessHours"
            defaultValue={defaultValues.businessHours}
            disabled={!canWrite}
          />
        </Field>
      </div>

      <Field label="Location" error={fieldErrors?.location?.[0]} className="space-y-2">
        <textarea
          name="location"
          defaultValue={defaultValues.location}
          rows={4}
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
            {pending ? "Saving..." : "Save changes"}
          </Button>
        </div>
      ) : null}
    </form>
  );
}
