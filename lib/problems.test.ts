import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  foreignKeyViolationProblem,
  forbiddenProblem,
  internalProblem,
  notFoundProblem,
  unauthorizedProblem,
  uniqueViolationProblem,
  validationProblem,
} from "./problems";
import { ProblemType } from "./types/problem-detail";

describe("problems factories", () => {
  describe("validationProblem", () => {
    it("zod error with field issues -> 422 with fieldErrors and issues array", () => {
      // Arrange
      const schema = z.object({
        name: z.string().min(1, "Name is required"),
        age: z.number().int().positive("Age must be positive"),
      });
      const result = schema.safeParse({ name: "", age: -1 });
      expect(result.success).toBe(false);
      if (result.success) return;

      // Act
      const problem = validationProblem(result.error, "Check the form");

      // Assert
      expect(problem.type).toBe(ProblemType.VALIDATION_ERROR);
      expect(problem.status).toBe(422);
      expect(problem.title).toBe("Validation failed");
      expect(problem.detail).toBe("Check the form");
      expect(problem.fieldErrors?.name?.[0]).toBe("Name is required");
      expect(problem.fieldErrors?.age?.[0]).toBe("Age must be positive");
      expect(problem.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ pointer: "#/name", detail: "Name is required" }),
          expect.objectContaining({ pointer: "#/age", detail: "Age must be positive" }),
        ]),
      );
    });

    it("no detail provided -> falls back to default detail string", () => {
      // Arrange
      const schema = z.object({ name: z.string().min(1) });
      const result = schema.safeParse({ name: "" });
      expect(result.success).toBe(false);
      if (result.success) return;

      // Act
      const problem = validationProblem(result.error);

      // Assert
      expect(problem.detail).toBe("One or more fields are invalid.");
    });
  });

  describe("notFoundProblem", () => {
    it("custom detail -> 404 with provided message", () => {
      // Act
      const problem = notFoundProblem("Product not found");

      // Assert
      expect(problem).toEqual({
        type: ProblemType.NOT_FOUND,
        status: 404,
        title: "Resource not found",
        detail: "Product not found",
      });
    });
  });

  describe("uniqueViolationProblem", () => {
    it("slug field with message -> 409 with fieldErrors under that key", () => {
      // Act
      const problem = uniqueViolationProblem("slug", "Slug already exists");

      // Assert
      expect(problem.type).toBe(ProblemType.UNIQUE_VIOLATION);
      expect(problem.status).toBe(409);
      expect(problem.fieldErrors).toEqual({ slug: ["Slug already exists"] });
    });
  });

  describe("foreignKeyViolationProblem", () => {
    it("custom detail -> 409 with fk violation type", () => {
      // Act
      const problem = foreignKeyViolationProblem("Cannot delete: has orders");

      // Assert
      expect(problem.type).toBe(ProblemType.FOREIGN_KEY_VIOLATION);
      expect(problem.status).toBe(409);
      expect(problem.detail).toBe("Cannot delete: has orders");
    });
  });

  describe("unauthorizedProblem", () => {
    it("default detail -> 401 with generic message", () => {
      // Act
      const problem = unauthorizedProblem();

      // Assert
      expect(problem.type).toBe(ProblemType.UNAUTHORIZED);
      expect(problem.status).toBe(401);
      expect(problem.detail).toBe("Authentication required");
    });

    it("custom detail -> 401 with provided message", () => {
      // Act
      const problem = unauthorizedProblem("Invalid credentials");

      // Assert
      expect(problem.detail).toBe("Invalid credentials");
    });
  });

  describe("forbiddenProblem", () => {
    it("default detail -> 403 with generic message", () => {
      // Act
      const problem = forbiddenProblem();

      // Assert
      expect(problem.type).toBe(ProblemType.FORBIDDEN);
      expect(problem.status).toBe(403);
      expect(problem.detail).toBe("Insufficient permissions");
    });
  });

  describe("internalProblem", () => {
    it("default detail -> 500 with generic message", () => {
      // Act
      const problem = internalProblem();

      // Assert
      expect(problem.type).toBe(ProblemType.INTERNAL_ERROR);
      expect(problem.status).toBe(500);
      expect(problem.detail).toBe("An unexpected error occurred");
    });
  });
});
