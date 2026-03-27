import { and, asc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { productVariants } from "@/lib/db/schema";

export function findByProductId(productId: string) {
  return db.query.productVariants.findMany({
    where: and(
      eq(productVariants.productId, productId),
      eq(productVariants.isActive, true),
    ),
    orderBy: [asc(productVariants.sortOrder)],
  });
}

export function findAllByProductId(productId: string) {
  return db.query.productVariants.findMany({
    where: eq(productVariants.productId, productId),
    orderBy: [asc(productVariants.sortOrder)],
  });
}

export function findById(id: string) {
  return db.query.productVariants.findFirst({
    where: eq(productVariants.id, id),
  });
}

export function create(data: typeof productVariants.$inferInsert) {
  return db
    .insert(productVariants)
    .values(data)
    .returning()
    .then((r) => r[0]);
}

export function update(
  id: string,
  data: Partial<typeof productVariants.$inferInsert>,
) {
  return db
    .update(productVariants)
    .set(data)
    .where(eq(productVariants.id, id))
    .returning()
    .then((r) => r[0]);
}

export function remove(id: string) {
  return db.delete(productVariants).where(eq(productVariants.id, id));
}
