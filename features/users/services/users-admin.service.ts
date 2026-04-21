import "server-only";

import bcrypt from "bcryptjs";
import { and, asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { parseCreateUserForm, parseUpdateUserForm } from "./users-admin.schemas";
import { canCreateRole, canEditUser, getSessionUser } from "@/lib/services/auth";
import { getStoreId } from "@/lib/config/tenant";
import { db } from "@/lib/db";
import { sessions, users } from "@/lib/db/schema";
import {
  forbiddenProblem,
  notFoundProblem,
  uniqueViolationProblem,
  validationProblem,
} from "@/lib/problems";
import type { FormState } from "@/lib/types/form-state";

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export function findAllByStore() {
  return db.query.users.findMany({
    where: eq(users.storeId, getStoreId()),
    orderBy: asc(users.createdAt),
    columns: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      storeId: true,
    },
  });
}

export function findById(id: string) {
  return db.query.users.findFirst({
    where: and(eq(users.id, id), eq(users.storeId, getStoreId())),
    columns: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      storeId: true,
    },
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export type UserFormState = FormState;

export async function createUser(
  _prev: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  const currentUser = await getSessionUser();

  const parsed = parseCreateUserForm(formData);
  if (!parsed.success) {
    return validationProblem(parsed.error);
  }

  if (!canCreateRole(currentUser.role, parsed.data.role)) {
    return forbiddenProblem("You cannot assign this role");
  }

  const storeId = getStoreId();
  const existing = await db.query.users.findFirst({
    where: and(eq(users.email, parsed.data.email), eq(users.storeId, storeId)),
  });
  if (existing) {
    return uniqueViolationProblem("email", "This email is already registered");
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  await db.insert(users).values({
    storeId,
    name: parsed.data.name,
    email: parsed.data.email,
    passwordHash,
    role: parsed.data.role,
    isActive: parsed.data.isActive,
  });

  revalidatePath("/admin/users");
  return { success: true };
}

export async function updateUser(
  id: string,
  _prev: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  const currentUser = await getSessionUser();

  const storeId = getStoreId();
  const targetUser = await db.query.users.findFirst({
    where: and(eq(users.id, id), eq(users.storeId, storeId)),
  });
  if (!targetUser) {
    return notFoundProblem("User not found");
  }

  if (targetUser.role === "ROOT") {
    return forbiddenProblem("Cannot modify the ROOT user");
  }

  const parsed = parseUpdateUserForm(formData);
  if (!parsed.success) {
    return validationProblem(parsed.error);
  }

  if (!canEditUser(currentUser.role, targetUser.role)) {
    return forbiddenProblem("You cannot edit this user");
  }

  if (
    parsed.data.role !== targetUser.role &&
    !canCreateRole(currentUser.role, parsed.data.role)
  ) {
    return forbiddenProblem("You cannot assign this role");
  }

  if (parsed.data.email !== targetUser.email) {
    const existing = await db.query.users.findFirst({
      where: and(
        eq(users.email, parsed.data.email),
        eq(users.storeId, storeId),
      ),
    });
    if (existing) {
      return uniqueViolationProblem("email", "This email is already registered");
    }
  }

  await db
    .update(users)
    .set({
      name: parsed.data.name,
      email: parsed.data.email,
      role: parsed.data.role,
      isActive: parsed.data.isActive,
    })
    .where(and(eq(users.id, id), eq(users.storeId, storeId)));

  if (!parsed.data.isActive && targetUser.isActive) {
    await db.delete(sessions).where(eq(sessions.userId, id));
  }

  revalidatePath("/admin/users");
  return { success: true };
}

export async function toggleUserActive(
  id: string,
): Promise<UserFormState> {
  const currentUser = await getSessionUser();

  const storeId = getStoreId();
  const targetUser = await db.query.users.findFirst({
    where: and(eq(users.id, id), eq(users.storeId, storeId)),
  });
  if (!targetUser) {
    return notFoundProblem("User not found");
  }

  if (targetUser.role === "ROOT") {
    return forbiddenProblem("Cannot deactivate the ROOT user");
  }

  if (!canEditUser(currentUser.role, targetUser.role)) {
    return forbiddenProblem("You cannot modify this user");
  }

  const newActive = !targetUser.isActive;

  await db
    .update(users)
    .set({ isActive: newActive })
    .where(and(eq(users.id, id), eq(users.storeId, storeId)));

  if (!newActive) {
    await db.delete(sessions).where(eq(sessions.userId, id));
  }

  revalidatePath("/admin/users");
  return { success: true };
}
