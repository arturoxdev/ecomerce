import type { z } from "zod";
import type { ProblemDetail } from "./types/problem-detail";
import { ProblemType } from "./types/problem-detail";

export function validationProblem(
  zodError: z.ZodError,
  detail?: string,
): ProblemDetail {
  const flat = zodError.flatten();
  const errors = zodError.issues.map((issue) => ({
    pointer: "#/" + issue.path.join("/"),
    detail: issue.message,
  }));
  return {
    type: ProblemType.VALIDATION_ERROR,
    status: 422,
    title: "Validation failed",
    detail: detail ?? "One or more fields are invalid.",
    fieldErrors: flat.fieldErrors as Record<string, string[]>,
    errors,
  };
}

export function notFoundProblem(detail: string): ProblemDetail {
  return {
    type: ProblemType.NOT_FOUND,
    status: 404,
    title: "Resource not found",
    detail,
  };
}

export function uniqueViolationProblem(
  field: string,
  message: string,
): ProblemDetail {
  return {
    type: ProblemType.UNIQUE_VIOLATION,
    status: 409,
    title: "Duplicate value",
    detail: message,
    fieldErrors: { [field]: [message] },
  };
}

export function foreignKeyViolationProblem(detail: string): ProblemDetail {
  return {
    type: ProblemType.FOREIGN_KEY_VIOLATION,
    status: 409,
    title: "Resource in use",
    detail,
  };
}

export function unauthorizedProblem(
  detail = "Authentication required",
): ProblemDetail {
  return {
    type: ProblemType.UNAUTHORIZED,
    status: 401,
    title: "Unauthorized",
    detail,
  };
}

export function forbiddenProblem(
  detail = "Insufficient permissions",
): ProblemDetail {
  return {
    type: ProblemType.FORBIDDEN,
    status: 403,
    title: "Forbidden",
    detail,
  };
}

export function internalProblem(
  detail = "An unexpected error occurred",
): ProblemDetail {
  return {
    type: ProblemType.INTERNAL_ERROR,
    status: 500,
    title: "Internal error",
    detail,
  };
}
