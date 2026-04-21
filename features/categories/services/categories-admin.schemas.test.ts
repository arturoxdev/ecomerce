import { describe, expect, it } from "vitest";

import {
  buildCategoryInsert,
  buildCategoryUpdate,
  parseCategoryForm,
  reorderSchema,
} from "./categories-admin.schemas";

function buildFormData(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(entries)) fd.set(key, value);
  return fd;
}

describe("categories-admin schemas", () => {
  describe("parseCategoryForm", () => {
    it("valid slug kebab-case -> success", () => {
      // Arrange
      const fd = buildFormData({
        name: "Chairs",
        slug: "folding-chairs",
        description: "All kinds",
      });

      // Act
      const result = parseCategoryForm(fd);

      // Assert
      expect(result.success).toBe(true);
    });

    it("slug with uppercase -> validation error", () => {
      // Arrange
      const fd = buildFormData({ name: "X", slug: "Bad-Slug" });

      // Act
      const result = parseCategoryForm(fd);

      // Assert
      expect(result.success).toBe(false);
    });

    it("empty name -> validation error", () => {
      // Arrange
      const fd = buildFormData({ name: "", slug: "ok" });

      // Act
      const result = parseCategoryForm(fd);

      // Assert
      expect(result.success).toBe(false);
    });

    it("empty description string -> coerced to undefined", () => {
      // Arrange
      const fd = buildFormData({ name: "N", slug: "n", description: "" });

      // Act
      const result = parseCategoryForm(fd);

      // Assert
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.description).toBeUndefined();
    });
  });

  describe("buildCategoryInsert", () => {
    it("input -> storeId + sortOrder + slugified", () => {
      // Act
      const result = buildCategoryInsert(
        { name: "Tables", slug: "Folding Tables", description: undefined },
        { storeId: "store-1", sortOrder: 3 },
      );

      // Assert
      expect(result.storeId).toBe("store-1");
      expect(result.sortOrder).toBe(3);
      expect(result.slug).toBe("folding-tables");
    });
  });

  describe("buildCategoryUpdate", () => {
    it("input -> no storeId/sortOrder in result", () => {
      // Act
      const result = buildCategoryUpdate({
        name: "Tables",
        slug: "Folding Tables",
        description: "desc",
      });

      // Assert
      expect(result).toEqual({
        name: "Tables",
        slug: "folding-tables",
        description: "desc",
      });
    });
  });

  describe("reorderSchema", () => {
    it("valid array -> success", () => {
      // Act
      const result = reorderSchema.safeParse([
        { id: "a", sortOrder: 0 },
        { id: "b", sortOrder: 1 },
      ]);

      // Assert
      expect(result.success).toBe(true);
    });

    it("negative sortOrder -> failure", () => {
      // Act
      const result = reorderSchema.safeParse([{ id: "a", sortOrder: -1 }]);

      // Assert
      expect(result.success).toBe(false);
    });

    it("empty id string -> failure", () => {
      // Act
      const result = reorderSchema.safeParse([{ id: "", sortOrder: 0 }]);

      // Assert
      expect(result.success).toBe(false);
    });
  });
});
