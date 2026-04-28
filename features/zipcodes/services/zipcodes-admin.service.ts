import "server-only";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { recordAudit } from "@/lib/audit";
import { requireWriteAccess } from "@/lib/services/auth";
import { getStoreId } from "@/lib/config/tenant";
import { db } from "@/lib/db";
import { isUniqueViolation } from "@/lib/db/errors";
import { zipDeliveryZones } from "@/lib/db/schema";
import {
  internalProblem,
  notFoundProblem,
  uniqueViolationProblem,
  validationProblem,
} from "@/lib/problems";
import type { FormState } from "@/lib/types/form-state";

import { parseZipcodeCsv, type CsvRowError } from "./csv-parser";
import {
  CSV_MAX_BYTES,
  parseZipcodeForm,
} from "./zipcodes-admin.schemas";

export type ZipcodeFormState = FormState;

export type BulkImportFormState =
  | Record<string, never>
  | {
      success: true;
      summary: { insertedN: number; updatedN: number; deletedN: number };
    }
  | {
      type: string;
      status: number;
      title: string;
      detail?: string;
      rowErrors?: CsvRowError[];
    };

function pairKey(city: string, zipcode: string): string {
  return `${city.toLowerCase()}|${zipcode}`;
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export async function createZipcode(
  _prev: ZipcodeFormState,
  formData: FormData,
): Promise<ZipcodeFormState> {
  const user = await requireWriteAccess();

  const parsed = parseZipcodeForm(formData);
  if (!parsed.success) return validationProblem(parsed.error);

  const storeId = getStoreId();
  const data = {
    storeId,
    city: parsed.data.city,
    zipCode: parsed.data.zipcode,
    fee: parsed.data.fee.toFixed(2),
  };

  try {
    const [inserted] = await db
      .insert(zipDeliveryZones)
      .values(data)
      .returning();

    await recordAudit({
      userId: user.id,
      action: "zipcode.create",
      entity: "zipcode",
      entityId: inserted.id,
      after: {
        city: inserted.city,
        zipCode: inserted.zipCode,
        fee: inserted.fee,
      },
    });
  } catch (e: unknown) {
    if (isUniqueViolation(e)) {
      return uniqueViolationProblem(
        "zipcode",
        "Ya existe un zipcode con esa ciudad",
      );
    }
    return internalProblem("No se pudo crear el zipcode");
  }

  revalidatePath("/admin/zipcodes");
  return { success: true };
}

export async function updateZipcode(
  id: string,
  _prev: ZipcodeFormState,
  formData: FormData,
): Promise<ZipcodeFormState> {
  const user = await requireWriteAccess();

  const parsed = parseZipcodeForm(formData);
  if (!parsed.success) return validationProblem(parsed.error);

  const storeId = getStoreId();

  const before = await db.query.zipDeliveryZones.findFirst({
    where: and(
      eq(zipDeliveryZones.id, id),
      eq(zipDeliveryZones.storeId, storeId),
    ),
  });
  if (!before) return notFoundProblem("Zipcode no encontrado");

  try {
    const [updated] = await db
      .update(zipDeliveryZones)
      .set({
        city: parsed.data.city,
        zipCode: parsed.data.zipcode,
        fee: parsed.data.fee.toFixed(2),
      })
      .where(
        and(
          eq(zipDeliveryZones.id, id),
          eq(zipDeliveryZones.storeId, storeId),
        ),
      )
      .returning();

    await recordAudit({
      userId: user.id,
      action: "zipcode.update",
      entity: "zipcode",
      entityId: id,
      before: {
        city: before.city,
        zipCode: before.zipCode,
        fee: before.fee,
      },
      after: {
        city: updated.city,
        zipCode: updated.zipCode,
        fee: updated.fee,
      },
    });
  } catch (e: unknown) {
    if (isUniqueViolation(e)) {
      return uniqueViolationProblem(
        "zipcode",
        "Ya existe un zipcode con esa ciudad",
      );
    }
    return internalProblem("No se pudo actualizar el zipcode");
  }

  revalidatePath("/admin/zipcodes");
  return { success: true };
}

export async function deleteZipcode(id: string): Promise<ZipcodeFormState> {
  const user = await requireWriteAccess();
  const storeId = getStoreId();

  const before = await db.query.zipDeliveryZones.findFirst({
    where: and(
      eq(zipDeliveryZones.id, id),
      eq(zipDeliveryZones.storeId, storeId),
    ),
  });
  if (!before) return notFoundProblem("Zipcode no encontrado");

  try {
    await db
      .delete(zipDeliveryZones)
      .where(
        and(
          eq(zipDeliveryZones.id, id),
          eq(zipDeliveryZones.storeId, storeId),
        ),
      );

    await recordAudit({
      userId: user.id,
      action: "zipcode.delete",
      entity: "zipcode",
      entityId: id,
      before: {
        city: before.city,
        zipCode: before.zipCode,
        fee: before.fee,
      },
    });
  } catch {
    return internalProblem("No se pudo eliminar el zipcode");
  }

  revalidatePath("/admin/zipcodes");
  return { success: true };
}

// ---------------------------------------------------------------------------
// Bulk import
// ---------------------------------------------------------------------------

export async function bulkImportZipcodes(
  _prev: BulkImportFormState,
  formData: FormData,
): Promise<BulkImportFormState> {
  const user = await requireWriteAccess();

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return {
      type: "/problems/validation-error",
      status: 422,
      title: "Validation failed",
      detail: "Falta el archivo CSV",
    };
  }

  if (file.size === 0) {
    return {
      type: "/problems/validation-error",
      status: 422,
      title: "Archivo vacío",
      detail: "El archivo no contiene datos",
    };
  }

  if (file.size > CSV_MAX_BYTES) {
    return {
      type: "/problems/validation-error",
      status: 413,
      title: "Archivo demasiado grande",
      detail: `El archivo excede ${CSV_MAX_BYTES / 1024 / 1024} MB`,
    };
  }

  const deleteAbsent = formData.get("deleteAbsent") === "true";

  const text = await file.text();
  const parsed = parseZipcodeCsv(text);

  if (!parsed.ok) {
    return {
      type: "/problems/validation-error",
      status: 422,
      title: "CSV inválido",
      detail: "Corrige las filas marcadas y vuelve a intentar",
      rowErrors: parsed.errors,
    };
  }

  const storeId = getStoreId();
  const csvKeys = new Set(
    parsed.rows.map((row) => pairKey(row.city, row.zipcode)),
  );

  try {
    const summary = await db.transaction(async (tx) => {
      const allExisting = await tx
        .select({
          id: zipDeliveryZones.id,
          city: zipDeliveryZones.city,
          zipCode: zipDeliveryZones.zipCode,
        })
        .from(zipDeliveryZones)
        .where(eq(zipDeliveryZones.storeId, storeId));

      const existingByPair = new Map(
        allExisting.map((row) => [pairKey(row.city, row.zipCode), row.id]),
      );

      let insertedN = 0;
      let updatedN = 0;

      for (const row of parsed.rows) {
        const key = pairKey(row.city, row.zipcode);
        const existingId = existingByPair.get(key);
        if (existingId) {
          await tx
            .update(zipDeliveryZones)
            .set({ fee: row.fee.toFixed(2) })
            .where(eq(zipDeliveryZones.id, existingId));
          updatedN += 1;
        } else {
          await tx.insert(zipDeliveryZones).values({
            storeId,
            city: row.city,
            zipCode: row.zipcode,
            fee: row.fee.toFixed(2),
          });
          insertedN += 1;
        }
      }

      let deletedN = 0;
      if (deleteAbsent) {
        const idsToDelete = allExisting
          .filter((row) => !csvKeys.has(pairKey(row.city, row.zipCode)))
          .map((row) => row.id);

        if (idsToDelete.length > 0) {
          const result = await tx
            .delete(zipDeliveryZones)
            .where(
              and(
                eq(zipDeliveryZones.storeId, storeId),
                sql`${zipDeliveryZones.id} = ANY(${idsToDelete}::uuid[])`,
              ),
            )
            .returning({ id: zipDeliveryZones.id });
          deletedN = result.length;
        }
      }

      return { insertedN, updatedN, deletedN };
    });

    await recordAudit({
      userId: user.id,
      action: "zipcode.bulk_import",
      entity: "zipcode",
      entityId: null,
      after: summary,
    });

    revalidatePath("/admin/zipcodes");
    return { success: true, summary };
  } catch {
    return {
      type: "/problems/internal-error",
      status: 500,
      title: "Error",
      detail: "No se pudo importar el archivo",
    };
  }
}
