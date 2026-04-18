import { describe, expect, it } from "vitest";

import {
  PG_FOREIGN_KEY_VIOLATION,
  PG_UNIQUE_VIOLATION,
  isForeignKeyViolation,
  isUniqueViolation,
} from "./errors";

describe("db error guards", () => {
  describe("isUniqueViolation", () => {
    it("error object with code 23505 -> true", () => {
      // Arrange
      const error = { code: PG_UNIQUE_VIOLATION, detail: "duplicate key" };

      // Act
      const result = isUniqueViolation(error);

      // Assert
      expect(result).toBe(true);
    });

    it("error object with different code -> false", () => {
      // Arrange
      const error = { code: "99999" };

      // Act
      const result = isUniqueViolation(error);

      // Assert
      expect(result).toBe(false);
    });

    it("null -> false", () => {
      expect(isUniqueViolation(null)).toBe(false);
    });

    it("string -> false", () => {
      expect(isUniqueViolation("boom")).toBe(false);
    });

    it("object without code -> false", () => {
      expect(isUniqueViolation({ message: "something" })).toBe(false);
    });
  });

  describe("isForeignKeyViolation", () => {
    it("error with code 23503 -> true", () => {
      // Arrange
      const error = { code: PG_FOREIGN_KEY_VIOLATION };

      // Act
      const result = isForeignKeyViolation(error);

      // Assert
      expect(result).toBe(true);
    });

    it("error with unique-violation code -> false", () => {
      // Arrange
      const error = { code: PG_UNIQUE_VIOLATION };

      // Act
      const result = isForeignKeyViolation(error);

      // Assert
      expect(result).toBe(false);
    });

    it("undefined -> false", () => {
      expect(isForeignKeyViolation(undefined)).toBe(false);
    });
  });
});
