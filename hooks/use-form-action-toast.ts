"use client";

import { useEffect } from "react";
import { toast } from "sonner";

import type { FormState } from "@/lib/types/form-state";

export function useFormActionToast(state: FormState, successMessage: string) {
  useEffect(() => {
    if (state.success) {
      toast.success(successMessage);
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state, successMessage]);
}
