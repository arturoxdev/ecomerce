/**
 * Rewrite `sslmode=prefer|require|verify-ca` to `sslmode=verify-full` on a
 * Postgres connection URL.
 *
 * Why: `pg-connection-string` (pg >= 8.19) emits a one-shot process warning
 * whenever it encounters the legacy modes, which today are silent aliases of
 * `verify-full` but will flip to libpq semantics in pg v9. Neon requires SSL
 * and presents a valid CA, so the current behavior (`verify-full`) is what
 * we want — we just make it explicit, which silences the warning.
 */
export function sanitizePostgresUrl(url: string): string {
  return url.replace(
    /([?&])sslmode=(prefer|require|verify-ca)(\b|&|$)/,
    "$1sslmode=verify-full$3",
  );
}
