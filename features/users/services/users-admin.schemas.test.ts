import { describe, expect, it } from "vitest";

import {
  parseCreateUserForm,
  parseUpdateUserForm,
} from "./users-admin.schemas";

function buildFormData(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(entries)) fd.set(key, value);
  return fd;
}

describe("users-admin schemas", () => {
  describe("parseCreateUserForm", () => {
    it("valid input -> parsed with isActive true", () => {
      // Arrange
      const fd = buildFormData({
        name: "Jane",
        email: "jane@example.com",
        password: "super-secret",
        role: "ADMIN",
        isActive: "true",
      });

      // Act
      const result = parseCreateUserForm(fd);

      // Assert
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.role).toBe("ADMIN");
      expect(result.data.isActive).toBe(true);
    });

    it("isActive not 'true' -> false", () => {
      // Arrange
      const fd = buildFormData({
        name: "Jane",
        email: "jane@example.com",
        password: "super-secret",
        role: "EMPLOYEE",
        isActive: "false",
      });

      // Act
      const result = parseCreateUserForm(fd);

      // Assert
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.isActive).toBe(false);
    });

    it("password too short -> validation error", () => {
      // Arrange
      const fd = buildFormData({
        name: "Jane",
        email: "jane@example.com",
        password: "short",
        role: "EMPLOYEE",
        isActive: "true",
      });

      // Act
      const result = parseCreateUserForm(fd);

      // Assert
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error.flatten().fieldErrors.password).toBeDefined();
    });

    it("invalid email -> validation error", () => {
      // Arrange
      const fd = buildFormData({
        name: "Jane",
        email: "not-email",
        password: "super-secret",
        role: "EMPLOYEE",
        isActive: "true",
      });

      // Act
      const result = parseCreateUserForm(fd);

      // Assert
      expect(result.success).toBe(false);
    });

    it("unknown role -> validation error", () => {
      // Arrange
      const fd = buildFormData({
        name: "Jane",
        email: "jane@example.com",
        password: "super-secret",
        role: "SUPERUSER",
        isActive: "true",
      });

      // Act
      const result = parseCreateUserForm(fd);

      // Assert
      expect(result.success).toBe(false);
    });
  });

  describe("parseUpdateUserForm", () => {
    it("valid input without password -> success", () => {
      // Arrange
      const fd = buildFormData({
        name: "Jane",
        email: "jane@example.com",
        role: "ADMIN",
        isActive: "true",
      });

      // Act
      const result = parseUpdateUserForm(fd);

      // Assert
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data).not.toHaveProperty("password");
    });
  });
});
