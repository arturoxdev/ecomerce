import "server-only";

import {
  and,
  asc,
  count as countFn,
  desc,
  eq,
  ilike,
  sql,
  SQL,
} from "drizzle-orm";

import { db } from "@/lib/db";
import {
  availability,
  categories,
  products,
  productVariants,
} from "@/lib/db/schema";

// ---------------------------------------------------------------------------
// Product reads
// ---------------------------------------------------------------------------

export function findAll(opts?: {
  where?: { isActive?: boolean };
  orderBy?: SQL;
  limit?: number;
  offset?: number;
}) {
  const conditions: SQL[] = [];
  if (opts?.where?.isActive !== undefined) {
    conditions.push(eq(products.isActive, opts.where.isActive));
  }

  return db.query.products.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    orderBy: opts?.orderBy ? () => [opts.orderBy!] : undefined,
    limit: opts?.limit,
    offset: opts?.offset,
  });
}

export function findAllWithCategory(opts?: {
  where?: { isActive?: boolean; categoryId?: string; search?: string };
  orderBy?: SQL;
  limit?: number;
  offset?: number;
}) {
  const conditions: SQL[] = [];
  if (opts?.where?.isActive !== undefined) {
    conditions.push(eq(products.isActive, opts.where.isActive));
  }
  if (opts?.where?.categoryId) {
    conditions.push(eq(products.categoryId, opts.where.categoryId));
  }
  if (opts?.where?.search) {
    conditions.push(ilike(products.name, `%${opts.where.search}%`));
  }

  return db.query.products.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    orderBy: opts?.orderBy ? () => [opts.orderBy!] : undefined,
    limit: opts?.limit,
    offset: opts?.offset,
    with: { category: true, variants: true },
  });
}

export async function findAllByCategorySlug(
  categorySlug: string,
  opts?: { orderBy?: SQL },
) {
  const category = await db.query.categories.findFirst({
    where: eq(categories.slug, categorySlug),
    columns: { id: true },
  });
  if (!category) return [];

  return db.query.products.findMany({
    where: and(
      eq(products.isActive, true),
      eq(products.categoryId, category.id),
    ),
    orderBy: opts?.orderBy ? () => [opts.orderBy!] : undefined,
    with: { category: true, variants: true },
  });
}

export function findProductById(id: string) {
  return db.query.products.findFirst({
    where: eq(products.id, id),
  });
}

export function findBySlug(slug: string) {
  return db.query.products.findFirst({
    where: eq(products.slug, slug),
    with: { category: true, variants: true },
  });
}

export function findByIdWithVariants(id: string) {
  return db.query.products.findFirst({
    where: eq(products.id, id),
    with: { variants: true },
  });
}

export function findBySlugMeta(slug: string) {
  return db.query.products.findFirst({
    where: eq(products.slug, slug),
    columns: { name: true, description: true },
  });
}

export function countProducts(where?: {
  isActive?: boolean;
  categoryId?: string;
  search?: string;
}) {
  const conditions: SQL[] = [];
  if (where?.isActive !== undefined) {
    conditions.push(eq(products.isActive, where.isActive));
  }
  if (where?.categoryId) {
    conditions.push(eq(products.categoryId, where.categoryId));
  }
  if (where?.search) {
    conditions.push(ilike(products.name, `%${where.search}%`));
  }
  return db
    .select({ count: countFn() })
    .from(products)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .then((r) => r[0].count);
}

// ---------------------------------------------------------------------------
// Variant reads
// ---------------------------------------------------------------------------

export function findVariantsByProductId(productId: string) {
  return db.query.productVariants.findMany({
    where: and(
      eq(productVariants.productId, productId),
      eq(productVariants.isActive, true),
    ),
    orderBy: [asc(productVariants.sortOrder)],
  });
}

export function findAllVariantsByProductId(productId: string) {
  return db.query.productVariants.findMany({
    where: eq(productVariants.productId, productId),
    orderBy: [asc(productVariants.sortOrder)],
  });
}

export function findVariantById(id: string) {
  return db.query.productVariants.findFirst({
    where: eq(productVariants.id, id),
  });
}

// ---------------------------------------------------------------------------
// Availability reads
// ---------------------------------------------------------------------------

export function findBlocksByProduct(productId: string) {
  return db.query.availability.findMany({
    where: eq(availability.productId, productId),
    orderBy: [desc(availability.startDate)],
    with: { order: { columns: { id: true, customerName: true } } },
  });
}

export function findBlockById(id: string) {
  return db.query.availability.findFirst({
    where: eq(availability.id, id),
  });
}

export function findByDateRange(
  productId: string,
  startDate: Date,
  endDate: Date,
  variantId?: string | null,
) {
  if (variantId) {
    return db.execute<{ occupied: number }>(sql`
      SELECT COALESCE(SUM(quantity), 0)::int AS occupied
      FROM availability
      WHERE product_id = ${productId}::uuid
        AND variant_id = ${variantId}::uuid
        AND start_date < ${endDate}::timestamp
        AND end_date > ${startDate}::timestamp
    `);
  }
  return db.execute<{ occupied: number }>(sql`
    SELECT COALESCE(SUM(quantity), 0)::int AS occupied
    FROM availability
    WHERE product_id = ${productId}::uuid
      AND variant_id IS NULL
      AND start_date < ${endDate}::timestamp
      AND end_date > ${startDate}::timestamp
  `);
}
