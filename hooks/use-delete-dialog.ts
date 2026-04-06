"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { isFormError, type FormState } from "@/lib/types/form-state";

export function useDeleteDialog() {
  const router = useRouter();
  const [targetId, setTargetId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function openDialog(id: string) {
    setTargetId(id);
  }

  function closeDialog() {
    setTargetId(null);
  }

  function confirmDelete(
    action: (id: string) => Promise<FormState>,
    successMessage: string,
  ) {
    if (!targetId) return;
    startTransition(async () => {
      const result = await action(targetId);
      setTargetId(null);
      if (isFormError(result)) {
        toast.error(result.detail ?? result.title);
      } else {
        toast.success(successMessage);
        router.refresh();
      }
    });
  }

  return { targetId, isPending, startTransition, openDialog, closeDialog, confirmDelete };
}
