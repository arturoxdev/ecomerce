import { asc, count, desc, eq, SQL } from "drizzle-orm";

import { db } from "@/lib/db";
import { categories, products } from "@/lib/db/schema";

export function findAll(opts?: {
  columns?: Record<string, boolean>;
  orderBy?: SQL;
  limit?: number;
}) {
  return db.query.categories.findMany({
    columns: opts?.columns as undefined,
    orderBy: opts?.orderBy ? () => [opts.orderBy!] : undefined,
    limit: opts?.limit,
  });
}

export function findAllWithProductCount() {
  return db.query.categories.findMany({
    orderBy: [asc(categories.sortOrder)],
    with: { products: { columns: { id: true } } },
  });
}

export function findById(id: string) {
  return db.query.categories.findFirst({
    where: eq(categories.id, id),
  });
}

export function create(
  data: typeof categories.$inferInsert,
) {
  return db.insert(categories).values(data).returning().then((r) => r[0]);
}

export function update(
  id: string,
  data: Partial<typeof categories.$inferInsert>,
) {
  return db
    .update(categories)
    .set(data)
    .where(eq(categories.id, id))
    .returning()
    .then((r) => r[0]);
}

export function remove(id: string) {
  return db.delete(categories).where(eq(categories.id, id));
}

export function updateOrder(items: { id: string; sortOrder: number }[]) {
  return db.transaction(async (tx) => {
    for (const item of items) {
      await tx
        .update(categories)
        .set({ sortOrder: item.sortOrder })
        .where(eq(categories.id, item.id));
    }
  });
}
