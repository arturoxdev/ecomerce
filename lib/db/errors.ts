export const PG_UNIQUE_VIOLATION = "23505";
export const PG_FOREIGN_KEY_VIOLATION = "23503";

function hasDbErrorCode(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === code
  );
}

export function isUniqueViolation(error: unknown): boolean {
  return hasDbErrorCode(error, PG_UNIQUE_VIOLATION);
}

export function isForeignKeyViolation(error: unknown): boolean {
  return hasDbErrorCode(error, PG_FOREIGN_KEY_VIOLATION);
}
