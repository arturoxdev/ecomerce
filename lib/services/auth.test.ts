import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

let authService: typeof import("@/lib/services/auth");

beforeAll(async () => {
  authService = await import("@/lib/services/auth");
});

describe("auth service", () => {
  describe("role permissions", () => {
    it("ROOT creating ADMIN -> allowed", () => {
      // Arrange
      const currentRole = "ROOT";
      const targetRole = "ADMIN";

      // Act
      const result = authService.canCreateRole(currentRole, targetRole);

      // Assert
      expect(result).toBe(true);
    });

    it("ADMIN creating ADMIN -> denied", () => {
      // Arrange
      const currentRole = "ADMIN";
      const targetRole = "ADMIN";

      // Act
      const result = authService.canCreateRole(currentRole, targetRole);

      // Assert
      expect(result).toBe(false);
    });

    it("ADMIN editing EMPLOYEE -> allowed", () => {
      // Arrange
      const currentRole = "ADMIN";
      const targetRole = "EMPLOYEE";

      // Act
      const result = authService.canEditUser(currentRole, targetRole);

      // Assert
      expect(result).toBe(true);
    });

    it("EMPLOYEE writing data -> denied", () => {
      // Arrange
      const role = "EMPLOYEE";

      // Act
      const result = authService.canWriteData(role);

      // Assert
      expect(result).toBe(false);
    });

    it("ROOT assignable roles -> ADMIN and EMPLOYEE", () => {
      // Arrange
      const role = "ROOT";

      // Act
      const result = authService.getAssignableRoles(role);

      // Assert
      expect(result).toEqual(["ADMIN", "EMPLOYEE"]);
    });
  });
});
