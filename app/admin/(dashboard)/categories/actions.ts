"use server";

import { desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireWriteAccess } from "@/lib/auth/session";
import { isForeignKeyViolation, isUniqueViolation } from "@/lib/db/errors";
import { categories } from "@/lib/db/schema";
import * as categoryRepo from "@/lib/repositories/category";
import type { FormState } from "@/lib/types/form-state";
import { toSlug } from "@/lib/utils";

const categorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required"),
  description: z.string().optional(),
});

export type CategoryFormState = FormState;

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
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    const existing = await categoryRepo.findAll({
      orderBy: desc(categories.sortOrder),
      limit: 1,
      columns: { sortOrder: true },
    });
    const nextOrder = (existing[0]?.sortOrder ?? -1) + 1;
    await categoryRepo.create({ ...parsed.data, slug: toSlug(parsed.data.slug), sortOrder: nextOrder });
  } catch (e: unknown) {
    if (isUniqueViolation(e)) {
      return { fieldErrors: { slug: ["Slug already exists"] } };
    }
    return { error: "Failed to create category" };
  }

  revalidatePath("/admin/categories");
  redirect("/admin/categories");
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
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    await categoryRepo.update(id, { ...parsed.data, slug: toSlug(parsed.data.slug) });
  } catch (e: unknown) {
    if (isUniqueViolation(e)) {
      return { fieldErrors: { slug: ["Slug already exists"] } };
    }
    return { error: "Failed to update category" };
  }

  revalidatePath("/admin/categories");
  redirect("/admin/categories");
}

// --- Category Reorder ---

const reorderSchema = z.array(
  z.object({
    id: z.string().min(1),
    sortOrder: z.number().int().min(0),
  }),
);

export async function updateCategoryOrder(
  items: { id: string; sortOrder: number }[],
): Promise<CategoryFormState> {
  await requireWriteAccess();
  const parsed = reorderSchema.safeParse(items);
  if (!parsed.success) {
    return { error: "Invalid order data" };
  }

  try {
    await categoryRepo.updateOrder(parsed.data);
  } catch {
    return { error: "Failed to update category order" };
  }

  revalidatePath("/admin/categories");
  return { success: true };
}

// --- Category CRUD ---

export async function deleteCategory(id: string): Promise<CategoryFormState> {
  await requireWriteAccess();
  try {
    await categoryRepo.remove(id);
  } catch (e: unknown) {
    if (isForeignKeyViolation(e)) {
      return { error: "Cannot delete: category has associated products" };
    }
    return { error: "Failed to delete category" };
  }

  revalidatePath("/admin/categories");
  return { success: true };
}
