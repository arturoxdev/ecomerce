import { z } from "zod";

import { validationProblem } from "@/lib/problems";
import { ProblemType } from "@/lib/types/problem-detail";
import type { ProblemDetail } from "@/lib/types/problem-detail";

export const manualBlockSchema = z.object({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  reason: z.string().max(255).optional(),
});

export type ManualBlockInput = z.infer<typeof manualBlockSchema>;

export type Clock = { now: () => Date };

const defaultClock: Clock = { now: () => new Date() };

export function parseManualBlockForm(formData: FormData) {
  return manualBlockSchema.safeParse({
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    reason: formData.get("reason") || undefined,
  });
}

/**
 * Validates rental window semantics (not-in-past, end-after-start).
 * Kept separate from the schema so it can be tested with an injectable
 * clock instead of relying on `new Date()` at module load.
 */
export function validateManualBlockDates(
  input: ManualBlockInput,
  clock: Clock = defaultClock,
): { ok: true } | { ok: false; problem: ProblemDetail } {
  const today = new Date(clock.now().toDateString());

  if (input.startDate < today) {
    return {
      ok: false,
      problem: {
        type: ProblemType.VALIDATION_ERROR,
        status: 422,
        title: "Validation failed",
        detail: "Start date cannot be in the past",
        fieldErrors: { startDate: ["Start date cannot be in the past"] },
      },
    };
  }

  if (input.endDate <= input.startDate) {
    return {
      ok: false,
      problem: {
        type: ProblemType.VALIDATION_ERROR,
        status: 422,
        title: "Validation failed",
        detail: "End date must be after start date",
        fieldErrors: { endDate: ["End date must be after start date"] },
      },
    };
  }

  return { ok: true };
}

/** Convenience: parse + validate in one call. */
export function parseAndValidateManualBlock(
  formData: FormData,
  clock: Clock = defaultClock,
):
  | { ok: true; data: ManualBlockInput }
  | { ok: false; problem: ProblemDetail } {
  const parsed = parseManualBlockForm(formData);
  if (!parsed.success) {
    return { ok: false, problem: validationProblem(parsed.error) };
  }
  const check = validateManualBlockDates(parsed.data, clock);
  if (!check.ok) return check;
  return { ok: true, data: parsed.data };
}
