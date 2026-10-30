"use client";

import { startTransition, useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getFieldErrors, isFormError, type FormState } from "@/lib/types/form-state";

type Copy = {
  name: string;
  email: string;
  phone: string;
  date: string;
  message: string;
  button: string;
  sending: string;
  success: string;
  placeholders: {
    name: string;
    email: string;
    phone: string;
    message: string;
  };
};

type Props = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  copy: Copy;
};

const fieldClassName =
  "h-12 rounded-xl border-[#e2e8f0] bg-white px-4 text-sm text-slate-700 focus-visible:border-primary";

export function ContactMessageForm({ action, copy }: Props) {
  const [state, formAction, pending] = useActionState(action, {} as FormState);
  const formRef = useRef<HTMLFormElement>(null);
  const fieldErrors = getFieldErrors(state);

  useEffect(() => {
    if ("success" in state && state.success) {
      toast.success(copy.success);
      formRef.current?.reset();
    } else if (isFormError(state)) {
      toast.error(state.detail ?? state.title);
    }
  }, [state, copy.success]);

  // Evita el reset automático de React 19 tras la acción: si hay errores de
  // validación, el visitante no pierde lo que escribió. Se resetea solo en éxito.
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate>
      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        <FormField id="contact-name" label={copy.name} error={fieldErrors?.name?.[0]}>
          <Input
            id="contact-name"
            name="name"
            autoComplete="name"
            required
            placeholder={copy.placeholders.name}
            aria-invalid={!!fieldErrors?.name}
            className={fieldClassName}
          />
        </FormField>
        <FormField id="contact-email" label={copy.email} error={fieldErrors?.email?.[0]}>
          <Input
            id="contact-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder={copy.placeholders.email}
            aria-invalid={!!fieldErrors?.email}
            className={fieldClassName}
          />
        </FormField>
        <FormField id="contact-phone" label={copy.phone} error={fieldErrors?.phone?.[0]}>
          <Input
            id="contact-phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            placeholder={copy.placeholders.phone}
            aria-invalid={!!fieldErrors?.phone}
            className={fieldClassName}
          />
        </FormField>
        <FormField id="contact-date" label={copy.date} error={fieldErrors?.eventDate?.[0]}>
          <Input
            id="contact-date"
            name="eventDate"
            type="date"
            aria-invalid={!!fieldErrors?.eventDate}
            className={fieldClassName}
          />
        </FormField>
      </div>

      <div className="mt-5">
        <FormField id="contact-message" label={copy.message} error={fieldErrors?.message?.[0]}>
          <Textarea
            id="contact-message"
            name="message"
            rows={5}
            required
            placeholder={copy.placeholders.message}
            aria-invalid={!!fieldErrors?.message}
            className="min-h-32 rounded-xl border-[#e2e8f0] bg-white px-4 py-3 text-sm text-slate-700 focus-visible:border-primary"
          />
        </FormField>
      </div>

      {/* Honeypot anti-spam: invisible para personas, los bots lo llenan. */}
      <div aria-hidden="true" className="absolute -left-[9999px] size-px overflow-hidden">
        <label htmlFor="contact-website">Website</label>
        <input id="contact-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-secondary px-5 py-3 text-sm font-bold text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {pending ? copy.sending : copy.button}
      </button>
    </form>
  );
}

function FormField({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label htmlFor={id} className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </Label>
      {children}
      {error ? <p className="mt-1.5 text-xs font-medium text-red-600">{error}</p> : null}
    </div>
  );
}
