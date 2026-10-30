import { describe, expect, it } from "vitest";

import { parseContactMessageForm } from "./contact-message.schemas";

function buildFormData(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(entries)) fd.set(key, value);
  return fd;
}

const valid = {
  name: "Ana López",
  email: "ana@example.com",
  phone: "+1 713 555 0198",
  eventDate: "2026-12-05",
  message: "Quiero rentar un brincolín para el 5 de diciembre.",
  website: "",
};

describe("contact-message schema", () => {
  it("datos completos -> válido", () => {
    const result = parseContactMessageForm("es", buildFormData(valid));
    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      name: "Ana López",
      email: "ana@example.com",
      eventDate: "2026-12-05",
    });
  });

  it("teléfono y fecha vacíos -> null", () => {
    const result = parseContactMessageForm(
      "en",
      buildFormData({ ...valid, phone: "", eventDate: "" }),
    );
    expect(result.success).toBe(true);
    expect(result.data?.phone).toBeNull();
    expect(result.data?.eventDate).toBeNull();
  });

  it("campos opcionales ausentes -> válido", () => {
    const fd = buildFormData({
      name: valid.name,
      email: valid.email,
      message: valid.message,
    });
    expect(parseContactMessageForm("en", fd).success).toBe(true);
  });

  it("correo inválido -> error localizado", () => {
    const result = parseContactMessageForm(
      "es",
      buildFormData({ ...valid, email: "no-es-correo" }),
    );
    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.email).toEqual([
      "El correo electrónico no es válido",
    ]);
  });

  it("nombre y mensaje solo con espacios -> error", () => {
    const result = parseContactMessageForm(
      "en",
      buildFormData({ ...valid, name: "   ", message: "  " }),
    );
    expect(result.success).toBe(false);
    const fieldErrors = result.error?.flatten().fieldErrors;
    expect(fieldErrors?.name).toEqual(["Name is required"]);
    expect(fieldErrors?.message).toEqual(["Tell us a bit about your event"]);
  });

  it("fecha con formato inválido -> error", () => {
    const result = parseContactMessageForm(
      "en",
      buildFormData({ ...valid, eventDate: "12/05/2026" }),
    );
    expect(result.success).toBe(false);
  });

  it("honeypot lleno -> rechazado", () => {
    const result = parseContactMessageForm(
      "en",
      buildFormData({ ...valid, website: "http://spam.example" }),
    );
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["website"]);
  });
});
