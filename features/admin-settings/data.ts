import "server-only";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { countTiers, getOrigin } from "@/features/delivery-pricing/data";
import { countZipcodes } from "@/features/zipcodes/services/zipcodes.service";
import { recordAudit } from "@/lib/audit";
import { getStoreId } from "@/lib/config/tenant";
import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import {
  forbiddenProblem,
  internalProblem,
  validationProblem,
} from "@/lib/problems";
import { requireWriteAccess } from "@/lib/services/auth";
import type { FormState } from "@/lib/types/form-state";

export type SettingsFormState = FormState;

const paymentSchema = z.object({
  paymentMode: z.enum(["SPLIT_50_50", "FULL_ONLINE"]),
  depositPercent: z.coerce.number().gt(0).max(1),
});

const deliverySchema = z
  .object({
    deliveryMode: z.enum([
      "INCLUDED",
      "FIXED_FEE",
      "ZIP_CODE",
      "DISTANCE_MILES",
    ]),
    deliveryFee: z.coerce.number().min(0).optional(),
  })
  .refine(
    (v) =>
      v.deliveryMode !== "FIXED_FEE" ||
      (typeof v.deliveryFee === "number" && v.deliveryFee >= 0),
    {
      message: "La tarifa de entrega es requerida cuando el modo es Tarifa fija",
      path: ["deliveryFee"],
    },
  );

export async function getSettings() {
  const row = await db.query.settings.findFirst({
    where: eq(settings.storeId, getStoreId()),
  });
  return row ?? null;
}

function customProblem(path: string, message: string) {
  return validationProblem(
    new z.ZodError([{ code: "custom", path: [path], message }]),
  );
}

export async function updatePaymentSettings(
  _prev: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const user = await requireWriteAccess();
  if (user.role !== "ROOT" && user.role !== "ADMIN") {
    return forbiddenProblem("Solo los administradores pueden editar los ajustes");
  }

  const parsed = paymentSchema.safeParse({
    paymentMode: formData.get("paymentMode"),
    depositPercent: formData.get("depositPercent"),
  });
  if (!parsed.success) return validationProblem(parsed.error);

  const storeId = getStoreId();
  const before = await db.query.settings.findFirst({
    where: eq(settings.storeId, storeId),
  });

  const data = {
    paymentMode: parsed.data.paymentMode,
    depositPercent: parsed.data.depositPercent.toFixed(4),
  };

  try {
    await db
      .insert(settings)
      .values({ storeId, ...data })
      .onConflictDoUpdate({ target: settings.storeId, set: data });
  } catch {
    return internalProblem("Failed to update settings");
  }

  await recordAudit({
    userId: user.id,
    action: "settings.payment.update",
    entity: "settings",
    entityId: storeId,
    before: before ?? null,
    after: data,
  });

  revalidatePath("/admin/settings/payments");
  revalidatePath("/[locale]", "layout");
  return { success: true };
}

export async function updateDeliverySettings(
  _prev: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const user = await requireWriteAccess();
  if (user.role !== "ROOT" && user.role !== "ADMIN") {
    return forbiddenProblem("Solo los administradores pueden editar los ajustes");
  }

  const parsed = deliverySchema.safeParse({
    deliveryMode: formData.get("deliveryMode"),
    deliveryFee: formData.get("deliveryFee") || undefined,
  });
  if (!parsed.success) return validationProblem(parsed.error);

  const storeId = getStoreId();

  // Activation gating: don't let a mode go live before it's usable.
  if (parsed.data.deliveryMode === "ZIP_CODE") {
    if ((await countZipcodes()) === 0) {
      return customProblem(
        "deliveryMode",
        "Configura al menos un zipcode antes de activar el modo por código postal",
      );
    }
  }

  if (parsed.data.deliveryMode === "DISTANCE_MILES") {
    const [origin, tierCount] = await Promise.all([
      getOrigin(storeId),
      countTiers(storeId),
    ]);
    if (origin.lat === null || origin.lng === null) {
      return customProblem(
        "deliveryMode",
        "Configura el origen de operaciones antes de activar el modo por distancia",
      );
    }
    if (tierCount === 0) {
      return customProblem(
        "deliveryMode",
        "Define al menos un tramo de distancia antes de activar el modo por distancia",
      );
    }
    if (
      !process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
      !process.env.GOOGLE_MAPS_SERVER_API_KEY
    ) {
      return customProblem(
        "deliveryMode",
        "Faltan las llaves de Google Maps (NEXT_PUBLIC_GOOGLE_MAPS_API_KEY y GOOGLE_MAPS_SERVER_API_KEY)",
      );
    }
  }

  const before = await db.query.settings.findFirst({
    where: eq(settings.storeId, storeId),
  });

  const data = {
    deliveryMode: parsed.data.deliveryMode,
    deliveryFee:
      parsed.data.deliveryMode === "FIXED_FEE"
        ? (parsed.data.deliveryFee ?? 0).toFixed(2)
        : null,
  };

  try {
    await db
      .insert(settings)
      .values({ storeId, ...data })
      .onConflictDoUpdate({ target: settings.storeId, set: data });
  } catch {
    return internalProblem("Failed to update settings");
  }

  await recordAudit({
    userId: user.id,
    action: "settings.delivery.update",
    entity: "settings",
    entityId: storeId,
    before: before ?? null,
    after: data,
  });

  revalidatePath("/admin/settings/delivery");
  revalidatePath("/[locale]", "layout");
  return { success: true };
}
