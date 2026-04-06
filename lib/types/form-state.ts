import type { ProblemDetail } from "./problem-detail";

/**
 * Union type for server action results.
 * Idle: {} (initial state for useActionState)
 * Success: { success: true }
 * Error: ProblemDetail (RFC 9457)
 */
export type FormState = Record<string, never> | { success: true } | ProblemDetail;

/** Type guard to check if a FormState is an error (ProblemDetail) */
export function isFormError(state: FormState): state is ProblemDetail {
  return "type" in state;
}

/** Safely extract fieldErrors from a FormState (returns undefined if not an error) */
export function getFieldErrors(
  state: FormState,
): Record<string, string[]> | undefined {
  return isFormError(state) ? state.fieldErrors : undefined;
}
