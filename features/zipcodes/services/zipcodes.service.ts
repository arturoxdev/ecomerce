import "server-only";

import { and, asc, eq, ilike, or, sql } from "drizzle-orm";

import { getStoreId } from "@/lib/config/tenant";
import { db, type Database } from "@/lib/db";
import { zipDeliveryZones } from "@/lib/db/schema";

export type ZipcodesServiceDeps = {
  db: Database;
  storeId: string;
};

export type ZipcodeRow = typeof zipDeliveryZones.$inferSelect;

export function createZipcodesService(deps: ZipcodesServiceDeps) {
  const { db: dbx, storeId } = deps;

  function searchFilter(search: string | undefined) {
    const trimmed = search?.trim();
    if (!trimmed) return eq(zipDeliveryZones.storeId, storeId);
    const pattern = `%${trimmed}%`;
    return and(
      eq(zipDeliveryZones.storeId, storeId),
      or(
        ilike(zipDeliveryZones.city, pattern),
        ilike(zipDeliveryZones.zipCode, pattern),
      ),
    );
  }

  function findAll(opts?: { search?: string; limit?: number; offset?: number }) {
    return dbx
      .select()
      .from(zipDeliveryZones)
      .where(searchFilter(opts?.search))
      .orderBy(asc(zipDeliveryZones.city), asc(zipDeliveryZones.zipCode))
      .limit(opts?.limit ?? 50)
      .offset(opts?.offset ?? 0);
  }

  function findById(id: string) {
    return dbx.query.zipDeliveryZones.findFirst({
      where: and(
        eq(zipDeliveryZones.id, id),
        eq(zipDeliveryZones.storeId, storeId),
      ),
    });
  }

  function findByCityAndCode(city: string, zipcode: string) {
    return dbx.query.zipDeliveryZones.findFirst({
      where: and(
        eq(zipDeliveryZones.city, city),
        eq(zipDeliveryZones.zipCode, zipcode),
        eq(zipDeliveryZones.storeId, storeId),
      ),
    });
  }

  async function count(opts?: { search?: string }): Promise<number> {
    const result = await dbx
      .select({ value: sql<number>`count(*)::int` })
      .from(zipDeliveryZones)
      .where(searchFilter(opts?.search));
    return result[0]?.value ?? 0;
  }

  async function search(query: string, limit = 20) {
    const trimmed = query.trim();
    if (!trimmed) {
      return dbx
        .select({
          city: zipDeliveryZones.city,
          zipcode: zipDeliveryZones.zipCode,
          fee: zipDeliveryZones.fee,
        })
        .from(zipDeliveryZones)
        .where(eq(zipDeliveryZones.storeId, storeId))
        .orderBy(asc(zipDeliveryZones.city), asc(zipDeliveryZones.zipCode))
        .limit(limit);
    }
    const pattern = `%${trimmed}%`;
    return dbx
      .select({
        city: zipDeliveryZones.city,
        zipcode: zipDeliveryZones.zipCode,
        fee: zipDeliveryZones.fee,
      })
      .from(zipDeliveryZones)
      .where(
        and(
          eq(zipDeliveryZones.storeId, storeId),
          or(
            ilike(zipDeliveryZones.city, pattern),
            ilike(zipDeliveryZones.zipCode, pattern),
          ),
        ),
      )
      .orderBy(asc(zipDeliveryZones.city), asc(zipDeliveryZones.zipCode))
      .limit(limit);
  }

  return { findAll, findById, findByCityAndCode, count, search };
}

export type ZipcodesService = ReturnType<typeof createZipcodesService>;

const defaultService = createZipcodesService({ db, storeId: getStoreId() });

export const findAllZipcodes = defaultService.findAll;
export const findZipcodeById = defaultService.findById;
export const findZipcodeByCityAndCode = defaultService.findByCityAndCode;
export const countZipcodes = defaultService.count;
export const searchZipcodes = defaultService.search;
