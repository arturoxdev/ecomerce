import { describe, expect, it } from "vitest";

import { parseEventInquiryForm } from "./event-inquiry.schemas";

function buildFormData(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(entries)) fd.set(key, value);
  return fd;
}

describe("event-inquiry schema", () => {
  it("correo válido con espacios -> válido y recortado", () => {
    const result = parseEventInquiryForm(
      "en",
      buildFormData({ email: "  ana@example.com ", website: "" }),
    );
    expect(result.success).toBe(true);
    expect(result.data?.email).toBe("ana@example.com");
  });

  it("honeypot ausente -> válido", () => {
    const result = parseEventInquiryForm(
      "en",
      buildFormData({ email: "ana@example.com" }),
    );
    expect(result.success).toBe(true);
  });

  it("correo inválido -> error localizado", () => {
    const result = parseEventInquiryForm(
      "es",
      buildFormData({ email: "no-es-correo", website: "" }),
    );
    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.email).toEqual([
      "El correo electrónico no es válido",
    ]);
  });

  it("correo vacío -> error", () => {
    const result = parseEventInquiryForm("en", buildFormData({ email: "" }));
    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.email).toEqual([
      "Please enter a valid email",
    ]);
  });

  it("honeypot lleno -> rechazado", () => {
    const result = parseEventInquiryForm(
      "en",
      buildFormData({ email: "ana@example.com", website: "http://spam.example" }),
    );
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["website"]);
  });
});
