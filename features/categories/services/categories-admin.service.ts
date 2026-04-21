import "server-only";

import { and, asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { findAll } from "./categories.service";
import {
  buildCategoryInsert,
  buildCategoryUpdate,
  parseCategoryForm,
  reorderSchema,
} from "./categories-admin.schemas";
import { requireWriteAccess } from "@/lib/services/auth";
import { getStoreId } from "@/lib/config/tenant";
import { db } from "@/lib/db";
import { isForeignKeyViolation, isUniqueViolation } from "@/lib/db/errors";
import { categories } from "@/lib/db/schema";
import {
  foreignKeyViolationProblem,
  internalProblem,
  uniqueViolationProblem,
  validationProblem,
} from "@/lib/problems";
import type { FormState } from "@/lib/types/form-state";

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

  const parsed = parseCategoryForm(formData);
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
      .values(
        buildCategoryInsert(parsed.data, {
          storeId: getStoreId(),
          sortOrder: nextOrder,
        }),
      )
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

  const parsed = parseCategoryForm(formData);
  if (!parsed.success) {
    return validationProblem(parsed.error);
  }

  try {
    await db
      .update(categories)
      .set(buildCategoryUpdate(parsed.data))
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
      return foreignKeyViolationProblem(
        "Cannot delete: category has associated products",
      );
    }
    return internalProblem("Failed to delete category");
  }

  revalidatePath("/admin/categories");
  return { success: true };
}
