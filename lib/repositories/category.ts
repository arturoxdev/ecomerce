import { and, asc, eq, SQL } from "drizzle-orm";

import { getStoreId } from "@/lib/config/tenant";
import { db } from "@/lib/db";
import { categories } from "@/lib/db/schema";

export function findAll(opts?: {
  columns?: Record<string, boolean>;
  orderBy?: SQL;
  limit?: number;
}) {
  return db.query.categories.findMany({
    where: eq(categories.storeId, getStoreId()),
    columns: opts?.columns as undefined,
    orderBy: opts?.orderBy ? () => [opts.orderBy!] : undefined,
    limit: opts?.limit,
  });
}

export function findAllWithProductCount() {
  return db.query.categories.findMany({
    where: eq(categories.storeId, getStoreId()),
    orderBy: [asc(categories.sortOrder)],
    with: { products: { columns: { id: true } } },
  });
}

export function findById(id: string) {
  return db.query.categories.findFirst({
    where: and(eq(categories.id, id), eq(categories.storeId, getStoreId())),
  });
}

export function findBySlug(slug: string) {
  return db.query.categories.findFirst({
    where: and(eq(categories.slug, slug), eq(categories.storeId, getStoreId())),
  });
}

export function create(
  data: Omit<typeof categories.$inferInsert, "storeId">,
) {
  return db.insert(categories).values({ ...data, storeId: getStoreId() }).returning().then((r) => r[0]);
}

export function update(
  id: string,
  data: Partial<typeof categories.$inferInsert>,
) {
  return db
    .update(categories)
    .set(data)
    .where(and(eq(categories.id, id), eq(categories.storeId, getStoreId())))
    .returning()
    .then((r) => r[0]);
}

export function remove(id: string) {
  return db.delete(categories).where(and(eq(categories.id, id), eq(categories.storeId, getStoreId())));
}

export function updateOrder(items: { id: string; sortOrder: number }[]) {
  return db.transaction(async (tx) => {
    for (const item of items) {
      await tx
        .update(categories)
        .set({ sortOrder: item.sortOrder })
        .where(and(eq(categories.id, item.id), eq(categories.storeId, getStoreId())));
    }
  });
}
