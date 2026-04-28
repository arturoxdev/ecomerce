import { z } from "zod";

import { validationProblem } from "@/lib/problems";
import { ProblemType } from "@/lib/types/problem-detail";
import type { ProblemDetail } from "@/lib/types/problem-detail";

export const manualBlockSchema = z.object({
  date: z.coerce.date(),
  reason: z.string().max(255).optional(),
});

export type ManualBlockInput = z.infer<typeof manualBlockSchema>;

export type Clock = { now: () => Date };

const defaultClock: Clock = { now: () => new Date() };

export function parseManualBlockForm(formData: FormData) {
  return manualBlockSchema.safeParse({
    date: formData.get("date"),
    reason: formData.get("reason") || undefined,
  });
}

export function validateManualBlockDates(
  input: ManualBlockInput,
  clock: Clock = defaultClock,
): { ok: true } | { ok: false; problem: ProblemDetail } {
  const today = new Date(clock.now().toDateString());

  if (input.date < today) {
    return {
      ok: false,
      problem: {
        type: ProblemType.VALIDATION_ERROR,
        status: 422,
        title: "Validación fallida",
        detail: "La fecha no puede estar en el pasado",
        fieldErrors: { date: ["La fecha no puede estar en el pasado"] },
      },
    };
  }

  return { ok: true };
}

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
