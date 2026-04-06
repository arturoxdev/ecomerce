import { and, count as countFn, eq, ilike, sql, SQL } from "drizzle-orm";

import { getStoreId } from "@/lib/config/tenant";
import { db } from "@/lib/db";
import { categories, products } from "@/lib/db/schema";

export function findAll(opts?: {
  where?: { isActive?: boolean };
  orderBy?: SQL;
  limit?: number;
  offset?: number;
}) {
  const conditions: SQL[] = [eq(products.storeId, getStoreId())];
  if (opts?.where?.isActive !== undefined) {
    conditions.push(eq(products.isActive, opts.where.isActive));
  }

  return db.query.products.findMany({
    where: and(...conditions),
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
  const conditions: SQL[] = [eq(products.storeId, getStoreId())];
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
    where: and(...conditions),
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
  const storeId = getStoreId();
  const category = await db.query.categories.findFirst({
    where: and(eq(categories.slug, categorySlug), eq(categories.storeId, storeId)),
    columns: { id: true },
  });
  if (!category) return [];

  return db.query.products.findMany({
    where: and(
      eq(products.storeId, storeId),
      eq(products.isActive, true),
      eq(products.categoryId, category.id),
    ),
    orderBy: opts?.orderBy ? () => [opts.orderBy!] : undefined,
    with: { category: true, variants: true },
  });
}

export function findById(id: string) {
  return db.query.products.findFirst({
    where: and(eq(products.id, id), eq(products.storeId, getStoreId())),
  });
}

export function findBySlug(slug: string) {
  return db.query.products.findFirst({
    where: and(eq(products.slug, slug), eq(products.storeId, getStoreId())),
    with: { category: true, variants: true },
  });
}

export function findByIdWithVariants(id: string) {
  return db.query.products.findFirst({
    where: and(eq(products.id, id), eq(products.storeId, getStoreId())),
    with: { variants: true },
  });
}

export function findBySlugMeta(slug: string) {
  return db.query.products.findFirst({
    where: and(eq(products.slug, slug), eq(products.storeId, getStoreId())),
    columns: { name: true, description: true },
  });
}

export function create(data: Omit<typeof products.$inferInsert, "storeId">) {
  return db
    .insert(products)
    .values({ ...data, storeId: getStoreId() })
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
    .where(and(eq(products.id, id), eq(products.storeId, getStoreId())))
    .returning()
    .then((r) => r[0]);
}

export function appendPhoto(id: string, url: string) {
  return db
    .update(products)
    .set({ photos: sql`array_append(${products.photos}, ${url})` })
    .where(and(eq(products.id, id), eq(products.storeId, getStoreId())))
    .returning({ photos: products.photos })
    .then((r) => r[0]);
}

export function removePhoto(id: string, url: string) {
  return db
    .update(products)
    .set({ photos: sql`array_remove(${products.photos}, ${url})` })
    .where(and(eq(products.id, id), eq(products.storeId, getStoreId())))
    .returning({ photos: products.photos })
    .then((r) => r[0]);
}

export function remove(id: string) {
  return db.delete(products).where(and(eq(products.id, id), eq(products.storeId, getStoreId())));
}

export function toggleActive(id: string, currentIsActive: boolean) {
  return db
    .update(products)
    .set({ isActive: !currentIsActive })
    .where(and(eq(products.id, id), eq(products.storeId, getStoreId())));
}

export function count(where?: { isActive?: boolean; categoryId?: string; search?: string }) {
  const conditions: SQL[] = [eq(products.storeId, getStoreId())];
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
    .where(and(...conditions))
    .then((r) => r[0].count);
}
