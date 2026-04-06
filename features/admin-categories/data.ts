import "server-only";

import { and, asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { findAll } from "@/features/catalog/data/categories";
import { requireWriteAccess } from "@/features/auth";
import { getStoreId } from "@/lib/config/tenant";
import { db } from "@/lib/db";
import { isForeignKeyViolation, isUniqueViolation } from "@/lib/db/errors";
import { categories } from "@/lib/db/schema";
import {
  validationProblem,
  uniqueViolationProblem,
  foreignKeyViolationProblem,
  internalProblem,
} from "@/lib/problems";
import type { FormState } from "@/lib/types/form-state";
import { toSlug } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const categorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z
    .string()
    .min(1, "Slug is required")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug must be lowercase, no spaces or special characters",
    ),
  description: z.string().optional(),
});

const reorderSchema = z.array(
  z.object({
    id: z.string().min(1),
    sortOrder: z.number().int().min(0),
  }),
);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CategoryFormState = FormState;

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export async function createCategory(
  _prev: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  await requireWriteAccess();
  const raw = {
    name: formData.get("name"),
    slug: formData.get("slug"),
    description: formData.get("description") || undefined,
  };

  const parsed = categorySchema.safeParse(raw);
  if (!parsed.success) {
    return validationProblem(parsed.error);
  }

  try {
    const existing = await findAll({
      orderBy: asc(categories.sortOrder),
      limit: 1,
      columns: { sortOrder: true },
    });
    const nextOrder = (existing[0]?.sortOrder ?? -1) + 1;
    await db
      .insert(categories)
      .values({
        ...parsed.data,
        slug: toSlug(parsed.data.slug),
        sortOrder: nextOrder,
        storeId: getStoreId(),
      })
      .returning()
      .then((r) => r[0]);
  } catch (e: unknown) {
    if (isUniqueViolation(e)) {
      return uniqueViolationProblem("slug", "Slug already exists");
    }
    return internalProblem("Failed to create category");
  }

  revalidatePath("/admin/categories");
  return { success: true };
}

export async function updateCategory(
  id: string,
  _prev: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  await requireWriteAccess();
  const raw = {
    name: formData.get("name"),
    slug: formData.get("slug"),
    description: formData.get("description") || undefined,
  };

  const parsed = categorySchema.safeParse(raw);
  if (!parsed.success) {
    return validationProblem(parsed.error);
  }

  try {
    await db
      .update(categories)
      .set({ ...parsed.data, slug: toSlug(parsed.data.slug) })
      .where(
        and(eq(categories.id, id), eq(categories.storeId, getStoreId())),
      )
      .returning()
      .then((r) => r[0]);
  } catch (e: unknown) {
    if (isUniqueViolation(e)) {
      return uniqueViolationProblem("slug", "Slug already exists");
    }
    return internalProblem("Failed to update category");
  }

  revalidatePath("/admin/categories");
  return { success: true };
}

export async function updateCategoryOrder(
  items: { id: string; sortOrder: number }[],
): Promise<CategoryFormState> {
  await requireWriteAccess();
  const parsed = reorderSchema.safeParse(items);
  if (!parsed.success) {
    return validationProblem(parsed.error, "Invalid order data");
  }

  try {
    const storeId = getStoreId();
    await db.transaction(async (tx) => {
      for (const item of parsed.data) {
        await tx
          .update(categories)
          .set({ sortOrder: item.sortOrder })
          .where(
            and(eq(categories.id, item.id), eq(categories.storeId, storeId)),
          );
      }
    });
  } catch {
    return internalProblem("Failed to update category order");
  }

  revalidatePath("/admin/categories");
  return { success: true };
}

export async function deleteCategory(
  id: string,
): Promise<CategoryFormState> {
  await requireWriteAccess();
  try {
    await db
      .delete(categories)
      .where(
        and(eq(categories.id, id), eq(categories.storeId, getStoreId())),
      );
  } catch (e: unknown) {
    if (isForeignKeyViolation(e)) {
      return foreignKeyViolationProblem("Cannot delete: category has associated products");
    }
    return internalProblem("Failed to delete category");
  }

  revalidatePath("/admin/categories");
  return { success: true };
}
