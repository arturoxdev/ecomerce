import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import * as schema from "@/lib/db/schema";
import { testDb } from "@/tests/integration/setup";

import { checkOverlapAndCreate } from "./products-admin.service";

// Integration tests rely on the default service instance which wraps the
// production `db` client; the test runner points `DATABASE_URL` at the same
// ephemeral Neon branch as `TEST_DATABASE_URL` (see `.env.test.local`).

async function seedProduct(stock = 2) {
  const [category] = await testDb
    .insert(schema.categories)
    .values({
      storeId: process.env.STORE_ID ?? "test-store",
      name: "Cat",
      slug: `cat-${Date.now()}`,
    })
    .returning();

  const [product] = await testDb
    .insert(schema.products)
    .values({
      storeId: process.env.STORE_ID ?? "test-store",
      name: "Prod",
      slug: `prod-${Date.now()}`,
      basePrice: "50.00",
      priceType: "PER_UNIT",
      stock,
      categoryId: category.id,
      isActive: true,
    })
    .returning();

  return product;
}

describe("products-admin service — integration", () => {
  describe("checkOverlapAndCreate", () => {
    it("first block within stock -> ok true and row inserted", async () => {
      // Arrange
      const product = await seedProduct(2);

      // Act
      const result = await checkOverlapAndCreate(
        product.id,
        new Date("2026-06-10"),
        new Date("2026-06-15"),
        1,
        product.stock,
      );

      // Assert
      expect(result.ok).toBe(true);
      const rows = await testDb.query.availability.findMany({
        where: eq(schema.availability.productId, product.id),
      });
      expect(rows).toHaveLength(1);
    });

    it("stock exhausted -> ok false and no new row", async () => {
      // Arrange
      const product = await seedProduct(1);

      // Seed existing block that fully occupies stock
      await testDb.insert(schema.availability).values({
        productId: product.id,
        startDate: new Date("2026-06-10"),
        endDate: new Date("2026-06-15"),
        quantity: 1,
      });

      // Act
      const result = await checkOverlapAndCreate(
        product.id,
        new Date("2026-06-12"),
        new Date("2026-06-14"),
        1,
        product.stock,
      );

      // Assert
      expect(result.ok).toBe(false);

      const rows = await testDb.query.availability.findMany({
        where: eq(schema.availability.productId, product.id),
      });
      expect(rows).toHaveLength(1);
    });

    it("overlap with stock > 1 allowing parallel block -> ok true", async () => {
      // Arrange
      const product = await seedProduct(2);
      await testDb.insert(schema.availability).values({
        productId: product.id,
        startDate: new Date("2026-06-10"),
        endDate: new Date("2026-06-15"),
        quantity: 1,
      });

      // Act
      const result = await checkOverlapAndCreate(
        product.id,
        new Date("2026-06-12"),
        new Date("2026-06-14"),
        1,
        product.stock,
      );

      // Assert
      expect(result.ok).toBe(true);
      const rows = await testDb.query.availability.findMany({
        where: eq(schema.availability.productId, product.id),
      });
      expect(rows).toHaveLength(2);
    });
  });
});
