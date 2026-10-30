"use client";

import { startTransition, useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";

import { getFieldErrors, isFormError, type FormState } from "@/lib/types/form-state";

type Copy = {
  inputPlaceholder: string;
  button: string;
  sending: string;
  success: string;
};

type Props = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  copy: Copy;
};

export function EventInquiryForm({ action, copy }: Props) {
  const [state, formAction, pending] = useActionState(action, {} as FormState);
  const formRef = useRef<HTMLFormElement>(null);
  const emailError = getFieldErrors(state)?.email?.[0];

  useEffect(() => {
    if ("success" in state && state.success) {
      toast.success(copy.success);
      formRef.current?.reset();
    } else if (isFormError(state) && !emailError) {
      toast.error(state.detail ?? state.title);
    }
  }, [state, copy.success, emailError]);

  // Evita el reset automático de React 19: si el correo es inválido, el
  // visitante no pierde lo que escribió. Se resetea solo en éxito.
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate className="mt-6 max-w-[420px]">
      <div className="flex gap-x-4">
        <label className="sr-only" htmlFor="event-inquiry-email">
          Email
        </label>
        <input
          autoComplete="email"
          className="min-w-0 flex-auto rounded-md border border-[#cbd5e1] px-3.5 py-2 text-slate-900 shadow-sm ring-0 aria-invalid:border-red-500"
          id="event-inquiry-email"
          name="email"
          placeholder={copy.inputPlaceholder}
          required
          type="email"
          aria-invalid={!!emailError}
          aria-describedby={emailError ? "event-inquiry-email-error" : undefined}
        />
        <button
          className="flex-none rounded-md bg-primary px-3.5 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-70"
          type="submit"
          disabled={pending}
        >
          {pending ? copy.sending : copy.button}
        </button>
      </div>
      {emailError ? (
        <p id="event-inquiry-email-error" className="mt-1.5 text-xs font-medium text-red-600">
          {emailError}
        </p>
      ) : null}

      {/* Honeypot anti-spam: invisible para personas, los bots lo llenan. */}
      <div aria-hidden="true" className="absolute -left-[9999px] size-px overflow-hidden">
        <label htmlFor="event-inquiry-website">Website</label>
        <input id="event-inquiry-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>
    </form>
  );
}
