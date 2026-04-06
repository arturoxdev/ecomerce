"use client";

import { useEffect } from "react";
import { toast } from "sonner";

import { isFormError, type FormState } from "@/lib/types/form-state";

export function useFormActionToast(state: FormState, successMessage: string) {
  useEffect(() => {
    if ("success" in state && state.success) {
      toast.success(successMessage);
    } else if (isFormError(state)) {
      toast.error(state.detail ?? state.title);
    }
  }, [state, successMessage]);
}
