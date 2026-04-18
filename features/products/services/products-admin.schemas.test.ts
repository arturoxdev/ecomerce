import { describe, expect, it } from "vitest";

import {
  buildProductInsert,
  buildProductUpdate,
  buildVariantInsert,
  buildVariantUpdate,
  parseProductForm,
  parseVariantForm,
} from "./products-admin.schemas";

function buildFormData(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    fd.set(key, value);
  }
  return fd;
}

describe("products-admin schemas", () => {
  describe("parseProductForm", () => {
    it("valid form data -> success with coerced types", () => {
      // Arrange
      const fd = buildFormData({
        name: "Tent",
        slug: "big-tent",
        description: "A big white tent",
        about: "",
        categoryId: "cat-1",
        basePrice: "199.99",
        priceType: "FIXED",
        stock: "3",
        photos: "https://example.com/a.jpg\nhttps://example.com/b.jpg",
        isActive: "true",
      });

      // Act
      const result = parseProductForm(fd);

      // Assert
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.basePrice).toBe(199.99);
      expect(result.data.stock).toBe(3);
      expect(result.data.isActive).toBe(true);
      expect(result.data.about).toBeUndefined();
    });

    it("missing name -> validation error on name", () => {
      // Arrange
      const fd = buildFormData({
        name: "",
        slug: "slug",
        categoryId: "cat",
        basePrice: "1",
        priceType: "FIXED",
        stock: "0",
        isActive: "true",
      });

      // Act
      const result = parseProductForm(fd);

      // Assert
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error.flatten().fieldErrors.name).toBeDefined();
    });

    it("too many photos -> validation error", () => {
      // Arrange
      const photos = Array.from({ length: 10 }, (_, i) => `https://x/${i}.jpg`).join("\n");
      const fd = buildFormData({
        name: "N",
        slug: "n",
        categoryId: "cat",
        basePrice: "1",
        priceType: "FIXED",
        stock: "0",
        isActive: "true",
        photos,
      });

      // Act
      const result = parseProductForm(fd);

      // Assert
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error.flatten().fieldErrors.photos).toBeDefined();
    });

    it("description over 150 chars -> validation error", () => {
      // Arrange
      const fd = buildFormData({
        name: "N",
        slug: "n",
        description: "x".repeat(151),
        categoryId: "cat",
        basePrice: "1",
        priceType: "FIXED",
        stock: "0",
        isActive: "true",
      });

      // Act
      const result = parseProductForm(fd);

      // Assert
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error.flatten().fieldErrors.description?.[0]).toContain(
        "150",
      );
    });

    it("isActive falsy -> parses to false", () => {
      // Arrange
      const fd = buildFormData({
        name: "N",
        slug: "n",
        categoryId: "cat",
        basePrice: "1",
        priceType: "FIXED",
        stock: "0",
        isActive: "false",
      });

      // Act
      const result = parseProductForm(fd);

      // Assert
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.isActive).toBe(false);
    });
  });

  describe("buildProductInsert", () => {
    const baseInput = {
      name: "Tent",
      slug: "Raw Slug With Spaces",
      description: "desc",
      about: "",
      categoryId: "cat-1",
      basePrice: 99.5,
      priceType: "FIXED" as const,
      stock: 5,
      photos: undefined,
      isActive: true,
    };

    it("valid input -> slug slugified, price stringified, null about", () => {
      // Act
      const result = buildProductInsert(baseInput, { storeId: "store-1" });

      // Assert
      expect(result.storeId).toBe("store-1");
      expect(result.slug).toBe("raw-slug-with-spaces");
      expect(result.basePrice).toBe("99.5");
      expect(result.about).toBeNull();
      expect(result.photos).toEqual([]);
    });

    it("photos string -> split, trimmed and filtered", () => {
      // Arrange
      const input = {
        ...baseInput,
        photos: "  https://x/a.jpg  \n\n https://x/b.jpg \n",
      };

      // Act
      const result = buildProductInsert(input, { storeId: "store-1" });

      // Assert
      expect(result.photos).toEqual([
        "https://x/a.jpg",
        "https://x/b.jpg",
      ]);
    });

    it("about with content -> kept as string", () => {
      // Arrange
      const input = { ...baseInput, about: "Detailed about" };

      // Act
      const result = buildProductInsert(input, { storeId: "store-1" });

      // Assert
      expect(result.about).toBe("Detailed about");
    });
  });

  describe("buildProductUpdate", () => {
    it("same input -> update object without storeId", () => {
      // Arrange
      const input = {
        name: "N",
        slug: "Raw Slug",
        description: undefined,
        about: "",
        categoryId: "cat",
        basePrice: 10,
        priceType: "PER_UNIT" as const,
        stock: 0,
        photos: undefined,
        isActive: false,
      };

      // Act
      const result = buildProductUpdate(input);

      // Assert
      expect(result).not.toHaveProperty("storeId");
      expect(result.slug).toBe("raw-slug");
      expect(result.basePrice).toBe("10");
    });
  });

  describe("parseVariantForm", () => {
    it("valid variant -> coerced numbers", () => {
      // Arrange
      const fd = buildFormData({ name: "Red", price: "10.5", stock: "4" });

      // Act
      const result = parseVariantForm(fd);

      // Assert
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.price).toBe(10.5);
      expect(result.data.stock).toBe(4);
    });

    it("zero price -> validation error (must be positive)", () => {
      // Arrange
      const fd = buildFormData({ name: "Red", price: "0", stock: "1" });

      // Act
      const result = parseVariantForm(fd);

      // Assert
      expect(result.success).toBe(false);
    });
  });

  describe("buildVariantInsert", () => {
    it("valid input -> productId + stringified price", () => {
      // Act
      const result = buildVariantInsert(
        { name: "Red", price: 12.5, stock: 3 },
        { productId: "product-1" },
      );

      // Assert
      expect(result).toEqual({
        productId: "product-1",
        name: "Red",
        price: "12.5",
        stock: 3,
      });
    });
  });

  describe("buildVariantUpdate", () => {
    it("valid input -> only name/price/stock keys", () => {
      // Act
      const result = buildVariantUpdate({ name: "Blue", price: 7, stock: 0 });

      // Assert
      expect(result).toEqual({ name: "Blue", price: "7", stock: 0 });
      expect(result).not.toHaveProperty("productId");
    });
  });
});
