import "server-only";

import { and, asc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { deliveryDistanceTiers, settings } from "@/lib/db/schema";

import type { DistanceTier } from "./services/distance-pricing.service";

// ── Tiers ──────────────────────────────────────────────────────

type TierRow = typeof deliveryDistanceTiers.$inferSelect;

function toTier(row: TierRow): DistanceTier {
  return {
    id: row.id,
    minMiles: Number.parseFloat(row.minMiles),
    maxMiles: Number.parseFloat(row.maxMiles),
    fee: Number.parseFloat(row.fee),
  };
}

export async function findTiersByStore(
  storeId: string,
): Promise<DistanceTier[]> {
  const rows = await db.query.deliveryDistanceTiers.findMany({
    where: eq(deliveryDistanceTiers.storeId, storeId),
    orderBy: asc(deliveryDistanceTiers.minMiles),
  });
  return rows.map(toTier);
}

export async function countTiers(storeId: string): Promise<number> {
  const rows = await db.query.deliveryDistanceTiers.findMany({
    where: eq(deliveryDistanceTiers.storeId, storeId),
    columns: { id: true },
  });
  return rows.length;
}

export type TierInput = { minMiles: number; maxMiles: number; fee: number };

export async function insertTier(
  storeId: string,
  input: TierInput,
): Promise<DistanceTier> {
  const [row] = await db
    .insert(deliveryDistanceTiers)
    .values({
      storeId,
      minMiles: input.minMiles.toFixed(2),
      maxMiles: input.maxMiles.toFixed(2),
      fee: input.fee.toFixed(2),
    })
    .returning();
  return toTier(row);
}

export async function updateTierRow(
  storeId: string,
  id: string,
  input: TierInput,
): Promise<DistanceTier | null> {
  const [row] = await db
    .update(deliveryDistanceTiers)
    .set({
      minMiles: input.minMiles.toFixed(2),
      maxMiles: input.maxMiles.toFixed(2),
      fee: input.fee.toFixed(2),
    })
    .where(
      and(
        eq(deliveryDistanceTiers.id, id),
        eq(deliveryDistanceTiers.storeId, storeId),
      ),
    )
    .returning();
  return row ? toTier(row) : null;
}

export async function deleteTierRow(
  storeId: string,
  id: string,
): Promise<boolean> {
  const rows = await db
    .delete(deliveryDistanceTiers)
    .where(
      and(
        eq(deliveryDistanceTiers.id, id),
        eq(deliveryDistanceTiers.storeId, storeId),
      ),
    )
    .returning({ id: deliveryDistanceTiers.id });
  return rows.length > 0;
}

// ── Operations origin (on the settings row) ────────────────────

export type Origin = {
  address: string | null;
  lat: number | null;
  lng: number | null;
};

export async function getOrigin(storeId: string): Promise<Origin> {
  const row = await db.query.settings.findFirst({
    where: eq(settings.storeId, storeId),
    columns: { originAddress: true, originLat: true, originLng: true },
  });
  return {
    address: row?.originAddress ?? null,
    lat: row?.originLat ? Number.parseFloat(row.originLat) : null,
    lng: row?.originLng ? Number.parseFloat(row.originLng) : null,
  };
}

export async function setOrigin(
  storeId: string,
  input: { address: string; lat: number; lng: number },
): Promise<void> {
  await db
    .insert(settings)
    .values({
      storeId,
      originAddress: input.address,
      originLat: input.lat.toFixed(7),
      originLng: input.lng.toFixed(7),
    })
    .onConflictDoUpdate({
      target: settings.storeId,
      set: {
        originAddress: input.address,
        originLat: input.lat.toFixed(7),
        originLng: input.lng.toFixed(7),
      },
    });
}
