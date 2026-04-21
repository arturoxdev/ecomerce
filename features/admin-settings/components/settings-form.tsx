"use client";

import { useActionState, useState } from "react";

import { Field } from "@/components/admin/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  getFieldErrors,
  isFormError,
  type FormState,
} from "@/lib/types/form-state";

type Props = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  defaultValues: {
    paymentMode: "SPLIT_50_50" | "FULL_ONLINE";
    deliveryMode: "INCLUDED" | "FIXED_FEE";
    deliveryFee?: string | null;
    depositPercent: string;
  };
};

export function SettingsForm({ action, defaultValues }: Props) {
  const [state, formAction, pending] = useActionState(action, {} as FormState);
  const fieldErrors = getFieldErrors(state);
  const [paymentMode, setPaymentMode] = useState(defaultValues.paymentMode);
  const [deliveryMode, setDeliveryMode] = useState(defaultValues.deliveryMode);
  const success = !isFormError(state) && "success" in state;

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-5">
      {isFormError(state) && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.detail ?? state.title}
        </p>
      )}
      {success && (
        <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
          Settings saved.
        </p>
      )}

      <Field label="Payment mode" error={fieldErrors?.paymentMode?.[0]}>
        <input type="hidden" name="paymentMode" value={paymentMode} />
        <Select
          value={paymentMode}
          onValueChange={(v) =>
            setPaymentMode((v ?? "SPLIT_50_50") as "SPLIT_50_50" | "FULL_ONLINE")
          }
        >
          <SelectTrigger className="w-full">
            {paymentMode === "FULL_ONLINE"
              ? "Full online (100%)"
              : "Split 50/50 (50% online, 50% on delivery)"}
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="SPLIT_50_50">
              Split 50/50 (50% online, 50% on delivery)
            </SelectItem>
            <SelectItem value="FULL_ONLINE">Full online (100%)</SelectItem>
          </SelectContent>
        </Select>
      </Field>

      <Field label="Delivery mode" error={fieldErrors?.deliveryMode?.[0]}>
        <input type="hidden" name="deliveryMode" value={deliveryMode} />
        <Select
          value={deliveryMode}
          onValueChange={(v) =>
            setDeliveryMode((v ?? "INCLUDED") as "INCLUDED" | "FIXED_FEE")
          }
        >
          <SelectTrigger className="w-full">
            {deliveryMode === "FIXED_FEE" ? "Fixed fee" : "Free (included)"}
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="INCLUDED">Free (included)</SelectItem>
            <SelectItem value="FIXED_FEE">Fixed fee</SelectItem>
          </SelectContent>
        </Select>
      </Field>

      {deliveryMode === "FIXED_FEE" && (
        <Field label="Delivery fee (USD)" error={fieldErrors?.deliveryFee?.[0]}>
          <Input
            type="number"
            name="deliveryFee"
            step="0.01"
            min="0"
            defaultValue={defaultValues.deliveryFee ?? ""}
            required
          />
        </Field>
      )}

      <Field
        label="Deposit percent (0 - 1)"
        error={fieldErrors?.depositPercent?.[0]}
      >
        <Input
          type="number"
          name="depositPercent"
          step="0.01"
          min="0.01"
          max="1"
          defaultValue={defaultValues.depositPercent}
          required
        />
      </Field>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save settings"}
        </Button>
      </div>
    </form>
  );
}
