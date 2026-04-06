"use server";

import { redirect } from "next/navigation";

import {
  createUser as dalCreate,
  updateUser as dalUpdate,
  toggleUserActive as dalToggle,
} from "@/lib/data/users";
import type { UserFormState } from "@/lib/data/users";

export async function createUser(
  _prev: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  const result = await dalCreate(_prev, formData);
  if ("success" in result) redirect("/admin/users");
  return result;
}

export async function updateUser(
  id: string,
  _prev: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  const result = await dalUpdate(id, _prev, formData);
  if ("success" in result) redirect("/admin/users");
  return result;
}

export async function toggleUserActive(id: string): Promise<UserFormState> {
  return dalToggle(id);
}
