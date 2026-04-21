"use server";

import { redirect } from "next/navigation";

import {
  createCategory as dalCreate,
  updateCategory as dalUpdate,
  updateCategoryOrder as dalUpdateOrder,
  deleteCategory as dalDelete,
} from "./services/categories-admin.service";
import type { CategoryFormState } from "./services/categories-admin.service";

export async function createCategory(
  _prev: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  const result = await dalCreate(_prev, formData);
  if ("success" in result) redirect("/admin/categories");
  return result;
}

export async function updateCategory(
  id: string,
  _prev: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  const result = await dalUpdate(id, _prev, formData);
  if ("success" in result) redirect("/admin/categories");
  return result;
}

export async function updateCategoryOrder(
  items: { id: string; sortOrder: number }[],
): Promise<CategoryFormState> {
  return dalUpdateOrder(items);
}

export async function deleteCategory(id: string): Promise<CategoryFormState> {
  return dalDelete(id);
}
