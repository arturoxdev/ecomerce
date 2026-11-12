import { describe, expect, it } from "vitest";

import * as schema from "@/lib/db/schema";
import { testDb } from "@/tests/integration/setup";

import { GET } from "./route";

const STORE_ID = process.env.STORE_ID ?? "test-store";

function futureDate(daysFromNow: number): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}

async function seedProduct() {
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
    const product = await seedProduct();

    const res = await GET(
      buildRequest({
        productId: product.id,
        date: futureDate(5),
      }) as never,
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ available: 4 });
  });

  it("occupied reduces availability -> available reflects subtraction", async () => {
    const product = await seedProduct();
    const date = new Date(`${futureDate(5)}T00:00:00.000Z`);
    await testDb.insert(schema.availability).values({
      productId: product.id,
      date,
      quantity: 3,
    });

    const res = await GET(
      buildRequest({
        productId: product.id,
        date: futureDate(5),
      }) as never,
    );

    const body = await res.json();
    expect(body.available).toBe(1);
  });

  it("one unit booked out of 4 -> remaining units stay rentable the same day", async () => {
    const product = await seedProduct();
    const date = new Date(`${futureDate(5)}T00:00:00.000Z`);
    await testDb.insert(schema.availability).values({
      productId: product.id,
      date,
      quantity: 1,
    });

    const res = await GET(
      buildRequest({
        productId: product.id,
        date: futureDate(5),
      }) as never,
    );

    const body = await res.json();
    expect(body.available).toBe(3);
  });

  it("all 4 units booked -> available 0", async () => {
    const product = await seedProduct();
    const date = new Date(`${futureDate(5)}T00:00:00.000Z`);
    await testDb.insert(schema.availability).values({
      productId: product.id,
      date,
      quantity: 4,
    });

    const res = await GET(
      buildRequest({
        productId: product.id,
        date: futureDate(5),
      }) as never,
    );

    const body = await res.json();
    expect(body.available).toBe(0);
  });

  it("inactive product -> 404 problem+json", async () => {
    const product = await seedProduct();
    const { eq } = await import("drizzle-orm");
    await testDb
      .update(schema.products)
      .set({ isActive: false })
      .where(eq(schema.products.id, product.id));

    const res = await GET(
      buildRequest({
        productId: product.id,
        date: futureDate(5),
      }) as never,
    );

    expect(res.status).toBe(404);
  });

  it("invalid UUID -> 400 problem+json", async () => {
    const res = await GET(
      buildRequest({
        productId: "not-a-uuid",
        date: futureDate(5),
      }) as never,
    );

    expect(res.status).toBe(400);
  });

  it("date in the past -> 400 problem+json", async () => {
    const product = await seedProduct();

    const res = await GET(
      buildRequest({
        productId: product.id,
        date: futureDate(-1),
      }) as never,
    );

    expect(res.status).toBe(400);
  });
});
