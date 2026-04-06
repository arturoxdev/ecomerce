---
paths:
  - "lib/data/**/*.ts"
  - "app/api/**/*.ts"
  - "lib/api/**/*.ts"
  - "lib/problems.ts"
  - "lib/types/problem-detail.ts"
---

# RFC 9457 — Problem Details for HTTP APIs

All error responses in this project follow RFC 9457. Every error MUST be a `ProblemDetail` object with at minimum: `type`, `status`, and `title`.

## Type definition

See `lib/types/problem-detail.ts` for the `ProblemDetail` type and `ProblemType` constants.

## Factory functions

Use the factories in `lib/problems.ts` instead of ad-hoc error objects:

| Factory | When to use |
|---------|-------------|
| `validationProblem(zodError)` | Zod validation fails (`parsed.success === false`) |
| `uniqueViolationProblem(field, msg)` | `isUniqueViolation(e)` in catch block |
| `foreignKeyViolationProblem(detail)` | `isForeignKeyViolation(e)` in catch block |
| `notFoundProblem(detail)` | Resource lookup returns null/undefined |
| `forbiddenProblem(detail)` | Permission/role check fails |
| `unauthorizedProblem(detail)` | Authentication required |
| `internalProblem(detail)` | Unexpected error in catch block |

## In API routes

Use `problemResponse()` from `lib/api/problem-response.ts` to return errors with `Content-Type: application/problem+json`:

```typescript
import { problemResponse } from "@/lib/api/problem-response";
import { notFoundProblem } from "@/lib/problems";

return problemResponse(notFoundProblem("Product not found"));
```

## In server actions / data layer

Return `ProblemDetail` objects directly (no HTTP wrapper needed):

```typescript
import { validationProblem, internalProblem } from "@/lib/problems";

const parsed = schema.safeParse(raw);
if (!parsed.success) return validationProblem(parsed.error);

// ... in catch block:
return internalProblem("Failed to create resource");
```

## Rules

- NEVER return `{ error: "..." }` or `{ fieldErrors: ... }` directly — always use the factories
- NEVER invent new `type` URIs inline — add them to `ProblemType` in `lib/types/problem-detail.ts`
- Success responses (`{ success: true }`) are NOT problem details and stay as-is
- The `detail` field should help the client correct the problem, not expose internals
