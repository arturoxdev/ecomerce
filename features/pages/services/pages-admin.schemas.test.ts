import { describe, expect, it } from "vitest";

import {
  localeSchema,
  parseAboutForm,
  parseContactForm,
  parseFaqPayload,
  parseMarkdownForm,
} from "./pages-admin.schemas";

function buildFormData(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(entries)) fd.set(key, value);
  return fd;
}

describe("pages-admin schemas", () => {
  describe("localeSchema", () => {
    it("en -> accepted", () => {
      expect(localeSchema.parse("en")).toBe("en");
    });

    it("fr -> rejected", () => {
      expect(() => localeSchema.parse("fr")).toThrow();
    });
  });

  describe("parseAboutForm", () => {
    it("all fields present -> success", () => {
      // Arrange
      const fd = buildFormData({
        eyebrow: "eye",
        title: "t",
        subtitle: "s",
        storyTitle: "st",
        storyBody: "sb",
        valuesTitle: "vt",
        valuesBody: "vb",
      });

      // Act
      const result = parseAboutForm(fd);

      // Assert
      expect(result.success).toBe(true);
    });

    it("missing field -> validation error on that field", () => {
      // Arrange
      const fd = buildFormData({
        eyebrow: "eye",
        title: "",
        subtitle: "s",
        storyTitle: "st",
        storyBody: "sb",
        valuesTitle: "vt",
        valuesBody: "vb",
      });

      // Act
      const result = parseAboutForm(fd);

      // Assert
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error.flatten().fieldErrors.title).toBeDefined();
    });
  });

  describe("parseMarkdownForm", () => {
    it("missing body -> validation error", () => {
      // Arrange
      const fd = buildFormData({ title: "T", subtitle: "S", body: "" });

      // Act
      const result = parseMarkdownForm(fd);

      // Assert
      expect(result.success).toBe(false);
    });
  });

  describe("parseContactForm", () => {
    it("invalid email -> validation error", () => {
      // Arrange
      const fd = buildFormData({
        title: "T",
        subtitle: "S",
        location: "Loc",
        phone: "555",
        email: "not-email",
        businessHours: "9-5",
      });

      // Act
      const result = parseContactForm(fd);

      // Assert
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error.flatten().fieldErrors.email).toBeDefined();
    });

    it("valid email -> success", () => {
      // Arrange
      const fd = buildFormData({
        title: "T",
        subtitle: "S",
        location: "Loc",
        phone: "555",
        email: "support@example.com",
        businessHours: "9-5",
      });

      // Act
      const result = parseContactForm(fd);

      // Assert
      expect(result.success).toBe(true);
    });
  });

  describe("parseFaqPayload", () => {
    it("valid payload -> coerced sortOrder", () => {
      // Act
      const result = parseFaqPayload({
        question: "Q",
        answer: "A",
        sortOrder: "3",
      });

      // Assert
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.sortOrder).toBe(3);
    });

    it("negative sortOrder -> validation error", () => {
      // Act
      const result = parseFaqPayload({
        question: "Q",
        answer: "A",
        sortOrder: -1,
      });

      // Assert
      expect(result.success).toBe(false);
    });
  });
});
