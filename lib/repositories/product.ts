import { and, count as countFn, eq, SQL } from "drizzle-orm";

import { db } from "@/lib/db";
import { categories, products } from "@/lib/db/schema";

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
    with: { category: true },
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
    with: { category: true },
  });
}

export function findById(id: string) {
  return db.query.products.findFirst({
    where: eq(products.id, id),
  });
}

export function findBySlug(slug: string) {
  return db.query.products.findFirst({
    where: eq(products.slug, slug),
    with: { category: true },
  });
}

export function findBySlugMeta(slug: string) {
  return db.query.products.findFirst({
    where: eq(products.slug, slug),
    columns: { name: true, description: true },
  });
}

export function create(data: typeof products.$inferInsert) {
  return db
    .insert(products)
    .values(data)
    .returning()
    .then((r) => r[0]);
}

export function update(
  id: string,
  data: Partial<typeof products.$inferInsert>,
) {
  return db
    .update(products)
    .set(data)
    .where(eq(products.id, id))
    .returning()
    .then((r) => r[0]);
}

export function remove(id: string) {
  return db.delete(products).where(eq(products.id, id));
}

export function toggleActive(id: string, currentIsActive: boolean) {
  return db
    .update(products)
    .set({ isActive: !currentIsActive })
    .where(eq(products.id, id));
}

export function count(where?: { isActive?: boolean }) {
  const conditions: SQL[] = [];
  if (where?.isActive !== undefined) {
    conditions.push(eq(products.isActive, where.isActive));
  }
  return db
    .select({ count: countFn() })
    .from(products)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .then((r) => r[0].count);
}
