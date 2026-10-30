import { describe, expect, it } from "vitest";

import {
  localeSchema,
  parseAboutForm,
  parseAboutMediaForm,
  parseContactForm,
  parseFaqPayload,
  parseHomeHeroTextsForm,
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

  describe("parseHomeHeroTextsForm", () => {
    it("empty highlight -> success with empty string", () => {
      // Arrange
      const fd = buildFormData({
        titleStart: "Make Your Party",
        titleHighlight: "",
        description: "Desc",
      });

      // Act
      const result = parseHomeHeroTextsForm(fd);

      // Assert
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.titleHighlight).toBe("");
    });

    it("missing highlight field -> success with empty string", () => {
      // Arrange
      const fd = buildFormData({ titleStart: "Title", description: "Desc" });

      // Act
      const result = parseHomeHeroTextsForm(fd);

      // Assert
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.titleHighlight).toBe("");
    });

    it("whitespace-only title -> validation error on titleStart", () => {
      // Arrange
      const fd = buildFormData({
        titleStart: "   ",
        titleHighlight: "Unforgettable",
        description: "Desc",
      });

      // Act
      const result = parseHomeHeroTextsForm(fd);

      // Assert
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error.flatten().fieldErrors.titleStart).toBeDefined();
    });

    it("missing description -> validation error on description", () => {
      // Arrange
      const fd = buildFormData({ titleStart: "T", titleHighlight: "H" });

      // Act
      const result = parseHomeHeroTextsForm(fd);

      // Assert
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error.flatten().fieldErrors.description).toBeDefined();
    });
  });

  describe("parseAboutMediaForm", () => {
    it("image url -> success", () => {
      // Arrange
      const fd = buildFormData({
        storyImageUrl: "https://cdn.example.com/store/about/a.webp",
      });

      // Act
      const result = parseAboutMediaForm(fd);

      // Assert
      expect(result.success).toBe(true);
    });

    it("video url -> validation error on storyImageUrl", () => {
      // Arrange
      const fd = buildFormData({
        storyImageUrl: "https://cdn.example.com/store/about/a.mp4",
      });

      // Act
      const result = parseAboutMediaForm(fd);

      // Assert
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error.flatten().fieldErrors.storyImageUrl).toEqual([
        "Solo se permiten imágenes",
      ]);
    });

    it("empty value -> validation error", () => {
      // Arrange
      const fd = buildFormData({ storyImageUrl: "" });

      // Act
      const result = parseAboutMediaForm(fd);

      // Assert
      expect(result.success).toBe(false);
    });
  });
});
