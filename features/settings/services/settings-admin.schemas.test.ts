import { describe, expect, it } from "vitest";

import { parseUpdateThemeForm } from "./settings-admin.schemas";

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
});
