import "server-only";

const PII_KEYS = new Set([
  "customerName",
  "customerEmail",
  "customerPhone",
  "deliveryAddress",
  "email",
  "phone",
  "name",
  "address",
]);

const BLOCKED_KEYS = new Set(["data", "object", "payload", "raw"]);

function sanitize(value: unknown, depth = 0): unknown {
  if (depth > 4) return "[Truncated]";
  if (value === null || value === undefined) return value;
  if (typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((v) => sanitize(v, depth + 1));

  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (PII_KEYS.has(k)) {
      out[k] = "[Redacted]";
      continue;
    }
    if (BLOCKED_KEYS.has(k)) {
      out[k] = "[Redacted]";
      continue;
    }
    out[k] = sanitize(v, depth + 1);
  }
  return out;
}

type Meta = Record<string, unknown> | undefined;

function emit(level: "info" | "warn" | "error", message: string, meta?: Meta) {
  const payload = meta ? sanitize(meta) : undefined;
  const line = {
    level,
    msg: message,
    ts: new Date().toISOString(),
    ...(payload && typeof payload === "object" ? payload : {}),
  };

  const text = JSON.stringify(line);
  if (level === "error") console.error(text);
  else if (level === "warn") console.warn(text);
  else console.log(text);
}

export const logger = {
  info: (message: string, meta?: Meta) => emit("info", message, meta),
  warn: (message: string, meta?: Meta) => emit("warn", message, meta),
  error: (message: string, meta?: Meta) => emit("error", message, meta),
};
