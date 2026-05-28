"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { recordAudit } from "@/lib/audit";
import { getStoreId } from "@/lib/config/tenant";
import {
  forbiddenProblem,
  internalProblem,
  notFoundProblem,
  validationProblem,
} from "@/lib/problems";
import { requireWriteAccess } from "@/lib/services/auth";
import type { FormState } from "@/lib/types/form-state";

import {
  deleteServiceRow,
  insertService,
  setServiceActive,
  updateServiceRow,
} from "./data";

export type GlobalServiceFormState = FormState;

const SERVICES_PATH = "/admin/settings/additional-services";

const serviceFormSchema = z.object({
  name: z.string().trim().min(1, "El nombre es requerido").max(120),
  price: z.coerce.number().min(0).max(99_999_999),
  description: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((value) => (value ? value : undefined)),
  // Checkbox semantics: present as "true" when checked, absent/"" otherwise.
  isActive: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => value === "true"),
  sortOrder: z.coerce.number().int().min(0).optional(),
});

function parseServiceForm(formData: FormData) {
  return serviceFormSchema.safeParse({
    name: formData.get("name"),
    price: formData.get("price"),
    description: formData.get("description") || undefined,
    isActive: formData.get("isActive") ?? "false",
    sortOrder: formData.get("sortOrder") || undefined,
  });
}

async function requireSettingsAccess() {
  const user = await requireWriteAccess();
  if (user.role !== "ROOT" && user.role !== "ADMIN") {
    return {
      user: null,
      problem: forbiddenProblem(
        "Solo los administradores pueden editar los ajustes",
      ),
    } as const;
  }
  return { user, problem: null } as const;
}

export async function createService(
  _prev: GlobalServiceFormState,
  formData: FormData,
): Promise<GlobalServiceFormState> {
  const { user, problem } = await requireSettingsAccess();
  if (problem) return problem;

  const parsed = parseServiceForm(formData);
  if (!parsed.success) return validationProblem(parsed.error);

  const storeId = getStoreId();
  try {
    const created = await insertService(storeId, {
      name: parsed.data.name,
      price: parsed.data.price,
      description: parsed.data.description,
      isActive: parsed.data.isActive,
      sortOrder: parsed.data.sortOrder ?? 0,
    });
    await recordAudit({
      userId: user.id,
      action: "global_service.create",
      entity: "store_additional_service",
      entityId: created.id,
      after: created,
    });
  } catch {
    return internalProblem("No se pudo crear el servicio");
  }

  revalidatePath(SERVICES_PATH);
  return { success: true };
}

export async function updateService(
  id: string,
  _prev: GlobalServiceFormState,
  formData: FormData,
): Promise<GlobalServiceFormState> {
  const { user, problem } = await requireSettingsAccess();
  if (problem) return problem;

  const parsed = parseServiceForm(formData);
  if (!parsed.success) return validationProblem(parsed.error);

  const storeId = getStoreId();
  try {
    const updated = await updateServiceRow(storeId, id, {
      name: parsed.data.name,
      price: parsed.data.price,
      description: parsed.data.description,
      isActive: parsed.data.isActive,
      sortOrder: parsed.data.sortOrder ?? 0,
    });
    if (!updated) return notFoundProblem("Servicio no encontrado");
    await recordAudit({
      userId: user.id,
      action: "global_service.update",
      entity: "store_additional_service",
      entityId: id,
      after: updated,
    });
  } catch {
    return internalProblem("No se pudo actualizar el servicio");
  }

  revalidatePath(SERVICES_PATH);
  return { success: true };
}

export async function toggleServiceActive(
  id: string,
  isActive: boolean,
): Promise<GlobalServiceFormState> {
  const { user, problem } = await requireSettingsAccess();
  if (problem) return problem;

  const storeId = getStoreId();
  try {
    const updated = await setServiceActive(storeId, id, isActive);
    if (!updated) return notFoundProblem("Servicio no encontrado");
    await recordAudit({
      userId: user.id,
      action: "global_service.update",
      entity: "store_additional_service",
      entityId: id,
      after: { isActive },
    });
  } catch {
    return internalProblem("No se pudo actualizar el servicio");
  }

  revalidatePath(SERVICES_PATH);
  return { success: true };
}

export async function deleteService(
  id: string,
): Promise<GlobalServiceFormState> {
  const { user, problem } = await requireSettingsAccess();
  if (problem) return problem;

  const storeId = getStoreId();
  const deleted = await deleteServiceRow(storeId, id);
  if (!deleted) return notFoundProblem("Servicio no encontrado");

  await recordAudit({
    userId: user.id,
    action: "global_service.delete",
    entity: "store_additional_service",
    entityId: id,
  });

  revalidatePath(SERVICES_PATH);
  return { success: true };
}
