import { describe, expect, it } from "vitest";

import {
  parseZipcodeForm,
  ZIPCODE_REGEX,
  zipcodeSchema,
} from "./zipcodes-admin.schemas";

function buildFormData(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(entries)) fd.set(key, value);
  return fd;
}

describe("zipcodes-admin schemas", () => {
  describe("ZIPCODE_REGEX", () => {
    it.each([
      ["11000"],
      ["M5V3L9"],
      ["ABC123"],
      ["1"],
      ["12345678"],
    ])("accepts valid zipcode %s", (value) => {
      // Assert
      expect(ZIPCODE_REGEX.test(value)).toBe(true);
    });

    it.each([
      [""],
      ["123456789"],
      ["12 34"],
      ["11-000"],
      ["abç1"],
    ])("rejects invalid zipcode %s", (value) => {
      // Assert
      expect(ZIPCODE_REGEX.test(value)).toBe(false);
    });
  });

  describe("zipcodeSchema", () => {
    it("rejects negative fee", () => {
      // Act
      const result = zipcodeSchema.safeParse({
        city: "Denver",
        zipcode: "80202",
        fee: -1,
      });

      // Assert
      expect(result.success).toBe(false);
    });

    it("coerces string fee to number", () => {
      // Act
      const result = zipcodeSchema.safeParse({
        city: "Denver",
        zipcode: "80202",
        fee: "50.5",
      });

      // Assert
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.fee).toBe(50.5);
    });

    it("rejects empty city", () => {
      // Act
      const result = zipcodeSchema.safeParse({
        city: "",
        zipcode: "80202",
        fee: 10,
      });

      // Assert
      expect(result.success).toBe(false);
    });

    it("trims city whitespace", () => {
      // Act
      const result = zipcodeSchema.safeParse({
        city: "  Denver  ",
        zipcode: "80202",
        fee: 10,
      });

      // Assert
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.city).toBe("Denver");
    });
  });

  describe("parseZipcodeForm", () => {
    it("valid form -> success", () => {
      // Arrange
      const fd = buildFormData({
        city: "Denver",
        zipcode: "80202",
        fee: "50",
      });

      // Act
      const result = parseZipcodeForm(fd);

      // Assert
      expect(result.success).toBe(true);
    });

    it("invalid zipcode -> failure", () => {
      // Arrange
      const fd = buildFormData({
        city: "Denver",
        zipcode: "11 000",
        fee: "50",
      });

      // Act
      const result = parseZipcodeForm(fd);

      // Assert
      expect(result.success).toBe(false);
    });

    it("missing city -> failure", () => {
      // Arrange
      const fd = buildFormData({ city: "", zipcode: "80202", fee: "50" });

      // Act
      const result = parseZipcodeForm(fd);

      // Assert
      expect(result.success).toBe(false);
    });
  });
});
