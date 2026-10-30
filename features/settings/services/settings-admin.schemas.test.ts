import { describe, expect, it } from "vitest";

import {
  parseEventWindowForm,
  parseSocialLinksForm,
  parseUpdateThemeForm,
} from "./settings-admin.schemas";

function buildFormData(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(entries)) fd.set(key, value);
  return fd;
}

describe("settings-admin schemas", () => {
  describe("parseUpdateThemeForm", () => {
    it("known themeId 'default' -> success", () => {
      // Arrange
      const fd = buildFormData({ themeId: "default" });

      // Act
      const result = parseUpdateThemeForm(fd);

      // Assert
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.themeId).toBe("default");
    });

    it("unknown themeId -> validation error", () => {
      // Arrange
      const fd = buildFormData({ themeId: "not-a-theme" });

      // Act
      const result = parseUpdateThemeForm(fd);

      // Assert
      expect(result.success).toBe(false);
    });
  });

  describe("parseEventWindowForm", () => {
    it("both null (empty strings) -> success (feature off)", () => {
      // Arrange
      const fd = buildFormData({ eventWindowStart: "", eventWindowEnd: "" });

      // Act
      const result = parseEventWindowForm(fd);

      // Assert
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.eventWindowStart).toBeNull();
      expect(result.data.eventWindowEnd).toBeNull();
    });

    it("valid start and end -> success", () => {
      // Arrange
      const fd = buildFormData({
        eventWindowStart: "09:00",
        eventWindowEnd: "12:00",
      });

      // Act
      const result = parseEventWindowForm(fd);

      // Assert
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.eventWindowStart).toBe("09:00");
      expect(result.data.eventWindowEnd).toBe("12:00");
    });

    it("end == start -> success (equal bound allowed)", () => {
      // Arrange
      const fd = buildFormData({
        eventWindowStart: "09:00",
        eventWindowEnd: "09:00",
      });

      // Act
      const result = parseEventWindowForm(fd);

      // Assert
      expect(result.success).toBe(true);
    });

    it("end < start -> validation error", () => {
      // Arrange
      const fd = buildFormData({
        eventWindowStart: "12:00",
        eventWindowEnd: "09:00",
      });

      // Act
      const result = parseEventWindowForm(fd);

      // Assert
      expect(result.success).toBe(false);
    });

    it("non-whole-hour start -> validation error", () => {
      // Arrange
      const fd = buildFormData({
        eventWindowStart: "09:30",
        eventWindowEnd: "12:00",
      });

      // Act
      const result = parseEventWindowForm(fd);

      // Assert
      expect(result.success).toBe(false);
    });

    it("non-whole-hour end -> validation error", () => {
      // Arrange
      const fd = buildFormData({
        eventWindowStart: "09:00",
        eventWindowEnd: "12:45",
      });

      // Act
      const result = parseEventWindowForm(fd);

      // Assert
      expect(result.success).toBe(false);
    });

    it("only start set, end empty -> validation error (must be together)", () => {
      // Arrange
      const fd = buildFormData({ eventWindowStart: "09:00", eventWindowEnd: "" });

      // Act
      const result = parseEventWindowForm(fd);

      // Assert
      expect(result.success).toBe(false);
    });

    it("only end set, start empty -> validation error (must be together)", () => {
      // Arrange
      const fd = buildFormData({ eventWindowStart: "", eventWindowEnd: "12:00" });

      // Act
      const result = parseEventWindowForm(fd);

      // Assert
      expect(result.success).toBe(false);
    });
  });

  describe("parseSocialLinksForm", () => {
    it("both https urls -> success", () => {
      // Arrange
      const fd = buildFormData({
        facebookUrl: "https://facebook.com/festejos",
        instagramUrl: "https://instagram.com/festejos",
      });

      // Act
      const result = parseSocialLinksForm(fd);

      // Assert
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data).toEqual({
        facebookUrl: "https://facebook.com/festejos",
        instagramUrl: "https://instagram.com/festejos",
      });
    });

    it("empty and blank values -> null (hidden in footer)", () => {
      // Arrange
      const fd = buildFormData({ facebookUrl: "", instagramUrl: "   " });

      // Act
      const result = parseSocialLinksForm(fd);

      // Assert
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data).toEqual({ facebookUrl: null, instagramUrl: null });
    });

    it("missing fields -> null", () => {
      // Act
      const result = parseSocialLinksForm(new FormData());

      // Assert
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data).toEqual({ facebookUrl: null, instagramUrl: null });
    });

    it("url without protocol -> validation error on that field", () => {
      // Arrange
      const fd = buildFormData({ facebookUrl: "facebook.com/festejos", instagramUrl: "" });

      // Act
      const result = parseSocialLinksForm(fd);

      // Assert
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error.flatten().fieldErrors.facebookUrl).toBeDefined();
      expect(result.error.flatten().fieldErrors.instagramUrl).toBeUndefined();
    });

    it("javascript: url -> validation error", () => {
      // Arrange
      const fd = buildFormData({ instagramUrl: "javascript:alert(1)" });

      // Act
      const result = parseSocialLinksForm(fd);

      // Assert
      expect(result.success).toBe(false);
    });
  });
});
