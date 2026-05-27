import "server-only";

import { and, asc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { storeAdditionalServices } from "@/lib/db/schema";

import type { GlobalService } from "./types";

// ── Global services ────────────────────────────────────────────

type ServiceRow = typeof storeAdditionalServices.$inferSelect;

function toService(row: ServiceRow): GlobalService {
  return {
    id: row.id,
    name: row.name,
    price: Number.parseFloat(row.price),
    description: row.description,
    isActive: row.isActive,
    sortOrder: row.sortOrder,
  };
}

export async function findServicesByStore(
  storeId: string,
): Promise<GlobalService[]> {
  const rows = await db.query.storeAdditionalServices.findMany({
    where: eq(storeAdditionalServices.storeId, storeId),
    orderBy: [
      asc(storeAdditionalServices.sortOrder),
      asc(storeAdditionalServices.createdAt),
    ],
  });
  return rows.map(toService);
}

export async function countServices(storeId: string): Promise<number> {
  const rows = await db.query.storeAdditionalServices.findMany({
    where: eq(storeAdditionalServices.storeId, storeId),
    columns: { id: true },
  });
  return rows.length;
}

export type ServiceInput = {
  name: string;
  price: number;
  description?: string;
  isActive: boolean;
  sortOrder: number;
};

export async function insertService(
  storeId: string,
  input: ServiceInput,
): Promise<GlobalService> {
  const [row] = await db
    .insert(storeAdditionalServices)
    .values({
      storeId,
      name: input.name,
      price: input.price.toFixed(2),
      description: input.description ?? null,
      isActive: input.isActive,
      sortOrder: input.sortOrder,
    })
    .returning();
  return toService(row);
}

export async function updateServiceRow(
  storeId: string,
  id: string,
  input: ServiceInput,
): Promise<GlobalService | null> {
  const [row] = await db
    .update(storeAdditionalServices)
    .set({
      name: input.name,
      price: input.price.toFixed(2),
      description: input.description ?? null,
      isActive: input.isActive,
      sortOrder: input.sortOrder,
    })
    .where(
      and(
        eq(storeAdditionalServices.id, id),
        eq(storeAdditionalServices.storeId, storeId),
      ),
    )
    .returning();
  return row ? toService(row) : null;
}

export async function setServiceActive(
  storeId: string,
  id: string,
  isActive: boolean,
): Promise<GlobalService | null> {
  const [row] = await db
    .update(storeAdditionalServices)
    .set({ isActive })
    .where(
      and(
        eq(storeAdditionalServices.id, id),
        eq(storeAdditionalServices.storeId, storeId),
      ),
    )
    .returning();
  return row ? toService(row) : null;
}

export async function deleteServiceRow(
  storeId: string,
  id: string,
): Promise<boolean> {
  const rows = await db
    .delete(storeAdditionalServices)
    .where(
      and(
        eq(storeAdditionalServices.id, id),
        eq(storeAdditionalServices.storeId, storeId),
      ),
    )
    .returning({ id: storeAdditionalServices.id });
  return rows.length > 0;
}
