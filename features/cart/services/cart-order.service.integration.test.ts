import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import * as schema from "@/lib/db/schema";
import { testDb } from "@/tests/integration/setup";

import { createCartOrderService } from "./cart-order.service";

const STORE_ID = "integration-cart-store";

type SeededProduct = {
  productId: string;
  categoryId: string;
};

async function seedCategoryAndProduct(
  overrides: Partial<typeof schema.products.$inferInsert> = {},
): Promise<SeededProduct> {
  const [category] = await testDb
    .insert(schema.categories)
    .values({
      storeId: STORE_ID,
      name: "Party",
      slug: `party-${Date.now()}`,
    })
    .returning();

  const [product] = await testDb
    .insert(schema.products)
    .values({
      storeId: STORE_ID,
      name: "Bouncy Castle",
      slug: `bouncy-${Date.now()}`,
      basePrice: "50.00",
      priceType: "FIXED",
      stock: 1,
      categoryId: category.id,
      isActive: true,
      ...overrides,
    })
    .returning();

  return { productId: product.id, categoryId: category.id };
}

async function seedSettings() {
  await testDb.insert(schema.settings).values({
    storeId: STORE_ID,
    deliveryMode: "INCLUDED",
    deliveryFee: "0",
    depositPercent: "0.10",
  });
}

function buildFindProductByIdWithVariants() {
  return async (productId: string) => {
    const row = await testDb.query.products.findFirst({
      where: eq(schema.products.id, productId),
      with: { variants: true },
    });
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      basePrice: row.basePrice,
      stock: row.stock,
      isActive: row.isActive,
      variants: row.variants?.map((v) => ({
        id: v.id,
        price: v.price,
        stock: v.stock,
      })),
    };
  };
}

async function loadStoreSettings() {
  return {
    deliveryMode: "INCLUDED",
    deliveryFee: 0,
    depositPercent: 0.1,
    paymentMode: "SPLIT_50_50" as const,
    currency: "USD",
  };
}

describe("cart-order service — integration", () => {
  it("happy path -> inserts order + orderItems + availability blocks", async () => {
    // Arrange
    await seedSettings();
    const { productId } = await seedCategoryAndProduct();
    const service = createCartOrderService({
      db: testDb,
      storeId: STORE_ID,
      findProductByIdWithVariants: buildFindProductByIdWithVariants(),
      loadStoreSettings,
    });

    // Act
    const result = await service.placeOrder({
      customerName: "Jane",
      customerEmail: "jane@example.com",
      customerPhone: "555-1111",
      deliveryAddress: "",
      items: [
        {
          productId,
          variantId: null,
          quantity: 1,
          unitPrice: 50,
          startDate: "2026-06-01",
          endDate: "2026-06-03",
        },
      ],
    });

    // Assert
    expect(result.success).toBe(true);
    if (!result.success) return;

    const order = await testDb.query.orders.findFirst({
      where: eq(schema.orders.id, result.orderId),
      with: { orderItems: true },
    });
    expect(order).toBeDefined();
    expect(order?.storeId).toBe(STORE_ID);
    expect(order?.orderItems).toHaveLength(1);

    const blocks = await testDb.query.availability.findMany({
      where: eq(schema.availability.orderId, result.orderId),
    });
    expect(blocks).toHaveLength(1);
  });

  it("inactive product -> UNAVAILABLE and no rows inserted", async () => {
    // Arrange
    await seedSettings();
    const { productId } = await seedCategoryAndProduct({ isActive: false });
    const service = createCartOrderService({
      db: testDb,
      storeId: STORE_ID,
      findProductByIdWithVariants: buildFindProductByIdWithVariants(),
      loadStoreSettings,
    });

    // Act
    const result = await service.placeOrder({
      customerName: "Jane",
      customerEmail: "jane@example.com",
      customerPhone: "555",
      deliveryAddress: "",
      items: [
        {
          productId,
          variantId: null,
          quantity: 1,
          unitPrice: 50,
          startDate: "2026-06-01",
          endDate: "2026-06-03",
        },
      ],
    });

    // Assert
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.unavailableItems).toBeDefined();

    const orderCount = await testDb.query.orders.findMany({
      where: eq(schema.orders.storeId, STORE_ID),
    });
    expect(orderCount).toHaveLength(0);
  });

  it("price mismatch -> UNAVAILABLE with product name reported", async () => {
    // Arrange
    await seedSettings();
    const { productId } = await seedCategoryAndProduct();
    const service = createCartOrderService({
      db: testDb,
      storeId: STORE_ID,
      findProductByIdWithVariants: buildFindProductByIdWithVariants(),
      loadStoreSettings,
    });

    // Act — sends wrong price (client-side tamper)
    const result = await service.placeOrder({
      customerName: "Jane",
      customerEmail: "jane@example.com",
      customerPhone: "555",
      deliveryAddress: "",
      items: [
        {
          productId,
          variantId: null,
          quantity: 1,
          unitPrice: 1,
          startDate: "2026-06-01",
          endDate: "2026-06-03",
        },
      ],
    });

    // Assert
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.unavailableItems).toEqual(["Bouncy Castle"]);
  });
});
