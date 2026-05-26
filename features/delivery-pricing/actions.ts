"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { recordAudit } from "@/lib/audit";
import { getStoreId } from "@/lib/config/tenant";
import {
  internalProblem,
  notFoundProblem,
  validationProblem,
} from "@/lib/problems";
import { requireWriteAccess } from "@/lib/services/auth";
import type { FormState } from "@/lib/types/form-state";

import {
  deleteTierRow,
  findTiersByStore,
  insertTier,
  setOrigin,
  updateTierRow,
} from "./data";
import {
  validateTiers,
  type TierBounds,
  type ValidateTiersError,
} from "./services/distance-pricing.service";

export type DeliveryPricingFormState = FormState;

const DELIVERY_PATH = "/admin/settings/delivery";

const tierFormSchema = z.object({
  minMiles: z.coerce.number().min(0).max(9999),
  maxMiles: z.coerce.number().min(0).max(9999),
  fee: z.coerce.number().min(0).max(99_999_999),
});

const originSchema = z.object({
  address: z.string().trim().min(1, "La dirección es requerida").max(500),
  lat: z.coerce.number().gte(-90).lte(90),
  lng: z.coerce.number().gte(-180).lte(180),
});

// Maps a whole-set validation failure onto the form field most relevant to it,
// so the admin sees the message next to the input they can act on.
const FIELD_BY_ERROR: Record<ValidateTiersError, string> = {
  EMPTY: "minMiles",
  NON_NUMERIC: "minMiles",
  NEGATIVE_FEE: "fee",
  BAD_RANGE: "maxMiles",
  FIRST_NOT_ZERO: "minMiles",
  GAP: "minMiles",
  OVERLAP: "minMiles",
};

function tierValidationProblem(error: ValidateTiersError, message: string) {
  return validationProblem(
    new z.ZodError([
      { code: "custom", path: [FIELD_BY_ERROR[error]], message },
    ]),
  );
}

function parseTierForm(formData: FormData) {
  return tierFormSchema.safeParse({
    minMiles: formData.get("minMiles"),
    maxMiles: formData.get("maxMiles"),
    fee: formData.get("fee"),
  });
}

export async function createTier(
  _prev: DeliveryPricingFormState,
  formData: FormData,
): Promise<DeliveryPricingFormState> {
  const user = await requireWriteAccess();

  const parsed = parseTierForm(formData);
  if (!parsed.success) return validationProblem(parsed.error);

  const storeId = getStoreId();
  const existing = await findTiersByStore(storeId);
  const candidate: TierBounds[] = [
    ...existing,
    parsed.data,
  ];
  const validation = validateTiers(candidate);
  if (!validation.ok) {
    return tierValidationProblem(validation.error, validation.message);
  }

  try {
    const created = await insertTier(storeId, parsed.data);
    await recordAudit({
      userId: user.id,
      action: "delivery_tier.create",
      entity: "delivery_distance_tier",
      entityId: created.id,
      after: created,
    });
  } catch {
    return internalProblem("No se pudo crear el tramo");
  }

  revalidatePath(DELIVERY_PATH);
  return { success: true };
}

export async function updateTier(
  id: string,
  _prev: DeliveryPricingFormState,
  formData: FormData,
): Promise<DeliveryPricingFormState> {
  const user = await requireWriteAccess();

  const parsed = parseTierForm(formData);
  if (!parsed.success) return validationProblem(parsed.error);

  const storeId = getStoreId();
  const existing = await findTiersByStore(storeId);
  if (!existing.some((tier) => tier.id === id)) {
    return notFoundProblem("Tramo no encontrado");
  }

  const candidate: TierBounds[] = existing.map((tier) =>
    tier.id === id ? parsed.data : tier,
  );
  const validation = validateTiers(candidate);
  if (!validation.ok) {
    return tierValidationProblem(validation.error, validation.message);
  }

  try {
    const updated = await updateTierRow(storeId, id, parsed.data);
    if (!updated) return notFoundProblem("Tramo no encontrado");
    await recordAudit({
      userId: user.id,
      action: "delivery_tier.update",
      entity: "delivery_distance_tier",
      entityId: id,
      after: updated,
    });
  } catch {
    return internalProblem("No se pudo actualizar el tramo");
  }

  revalidatePath(DELIVERY_PATH);
  return { success: true };
}

export async function deleteTier(
  id: string,
): Promise<DeliveryPricingFormState> {
  const user = await requireWriteAccess();
  const storeId = getStoreId();

  const deleted = await deleteTierRow(storeId, id);
  if (!deleted) return notFoundProblem("Tramo no encontrado");

  await recordAudit({
    userId: user.id,
    action: "delivery_tier.delete",
    entity: "delivery_distance_tier",
    entityId: id,
  });

  revalidatePath(DELIVERY_PATH);
  return { success: true };
}

export async function updateOrigin(
  _prev: DeliveryPricingFormState,
  formData: FormData,
): Promise<DeliveryPricingFormState> {
  const user = await requireWriteAccess();

  const parsed = originSchema.safeParse({
    address: formData.get("originAddress"),
    lat: formData.get("originLat"),
    lng: formData.get("originLng"),
  });
  if (!parsed.success) return validationProblem(parsed.error);

  const storeId = getStoreId();
  try {
    await setOrigin(storeId, parsed.data);
    await recordAudit({
      userId: user.id,
      action: "delivery_origin.update",
      entity: "settings",
      entityId: storeId,
      after: { originAddress: parsed.data.address },
    });
  } catch {
    return internalProblem("No se pudo guardar el origen de operaciones");
  }

  revalidatePath(DELIVERY_PATH);
  return { success: true };
}
