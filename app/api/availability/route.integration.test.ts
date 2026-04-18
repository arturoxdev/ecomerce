import { describe, expect, it } from "vitest";

import { schema, testDb } from "@/tests/integration/setup";

import { GET } from "./route";

const STORE_ID = process.env.STORE_ID ?? "test-store";

async function seedProduct(priceType: "FIXED" | "PER_UNIT" = "PER_UNIT") {
  const [category] = await testDb
    .insert(schema.categories)
    .values({ storeId: STORE_ID, name: "Cat", slug: `cat-${Date.now()}` })
    .returning();

  const [product] = await testDb
    .insert(schema.products)
    .values({
      storeId: STORE_ID,
      name: "Prod",
      slug: `prod-${Date.now()}`,
      basePrice: "10.00",
      priceType,
      stock: 4,
      categoryId: category.id,
      isActive: true,
    })
    .returning();

  return product;
}

function buildRequest(params: Record<string, string>): Request {
  const url = new URL("http://localhost/api/availability");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new Request(url);
}

describe("/api/availability — integration", () => {
  it("valid request with no occupied -> 200 with available=stock", async () => {
    // Arrange
    const product = await seedProduct();

    // Act
    const res = await GET(
      buildRequest({
        productId: product.id,
        start: "2026-06-10",
        end: "2026-06-12",
      }) as never,
    );

    // Assert
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ available: 4, pricingModel: "PER_UNIT" });
  });

  it("occupied reduces availability -> available reflects subtraction", async () => {
    // Arrange
    const product = await seedProduct();
    await testDb.insert(schema.availability).values({
      productId: product.id,
      startDate: new Date("2026-06-10"),
      endDate: new Date("2026-06-12"),
      quantity: 3,
    });

    // Act
    const res = await GET(
      buildRequest({
        productId: product.id,
        start: "2026-06-10",
        end: "2026-06-12",
      }) as never,
    );

    // Assert
    const body = await res.json();
    expect(body.available).toBe(1);
  });

  it("inactive product -> 404 problem+json", async () => {
    // Arrange
    const product = await seedProduct();
    const { eq } = await import("drizzle-orm");
    await testDb
      .update(schema.products)
      .set({ isActive: false })
      .where(eq(schema.products.id, product.id));

    // Act
    const res = await GET(
      buildRequest({
        productId: product.id,
        start: "2026-06-10",
        end: "2026-06-12",
      }) as never,
    );

    // Assert
    expect(res.status).toBe(404);
  });

  it("invalid UUID -> 400 problem+json", async () => {
    // Act
    const res = await GET(
      buildRequest({
        productId: "not-a-uuid",
        start: "2026-06-10",
        end: "2026-06-12",
      }) as never,
    );

    // Assert
    expect(res.status).toBe(400);
  });
});
