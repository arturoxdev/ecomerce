import "server-only";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireWriteAccess } from "@/features/auth/session";
import { recordAudit } from "@/lib/audit";
import { getStoreId } from "@/lib/config/tenant";
import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import {
  forbiddenProblem,
  internalProblem,
  validationProblem,
} from "@/lib/problems";
import type { FormState } from "@/lib/types/form-state";

export type SettingsFormState = FormState;

const settingsSchema = z
  .object({
    paymentMode: z.enum(["SPLIT_50_50", "FULL_ONLINE"]),
    deliveryMode: z.enum(["INCLUDED", "FIXED_FEE"]),
    deliveryFee: z.coerce.number().min(0).optional(),
    depositPercent: z.coerce.number().gt(0).max(1),
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

export async function updateSettings(
  _prev: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const user = await requireWriteAccess();
  if (user.role !== "ROOT" && user.role !== "ADMIN") {
    return forbiddenProblem("Solo los administradores pueden editar los ajustes");
  }

  const raw = {
    paymentMode: formData.get("paymentMode"),
    deliveryMode: formData.get("deliveryMode"),
    deliveryFee: formData.get("deliveryFee") || undefined,
    depositPercent: formData.get("depositPercent"),
  };

  const parsed = settingsSchema.safeParse(raw);
  if (!parsed.success) return validationProblem(parsed.error);

  const storeId = getStoreId();
  const before = await db.query.settings.findFirst({
    where: eq(settings.storeId, storeId),
  });

  const data = {
    paymentMode: parsed.data.paymentMode,
    deliveryMode: parsed.data.deliveryMode,
    deliveryFee:
      parsed.data.deliveryMode === "FIXED_FEE"
        ? (parsed.data.deliveryFee ?? 0).toFixed(2)
        : null,
    depositPercent: parsed.data.depositPercent.toFixed(4),
    currency: "USD",
  };

  try {
    await db
      .insert(settings)
      .values({ storeId, ...data })
      .onConflictDoUpdate({
        target: settings.storeId,
        set: data,
      });
  } catch {
    return internalProblem("Failed to update settings");
  }

  await recordAudit({
    userId: user.id,
    action: "settings.update",
    entity: "settings",
    entityId: storeId,
    before: before ?? null,
    after: data,
  });

  revalidatePath("/admin/settings");
  revalidatePath("/[locale]", "layout");
  return { success: true };
}
