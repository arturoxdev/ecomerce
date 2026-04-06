import "server-only";

import bcrypt from "bcryptjs";
import { and, asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { canCreateRole, canEditUser } from "@/features/auth";
import { getSessionUser } from "@/features/auth";
import { getStoreId } from "@/lib/config/tenant";
import { db } from "@/lib/db";
import { sessions, users, userRoleEnum } from "@/lib/db/schema";
import {
  validationProblem,
  uniqueViolationProblem,
  notFoundProblem,
  forbiddenProblem,
} from "@/lib/problems";
import type { FormState } from "@/lib/types/form-state";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const createUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(userRoleEnum.enumValues),
  isActive: z.boolean().default(true),
});

const updateUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  role: z.enum(userRoleEnum.enumValues),
  isActive: z.boolean().default(true),
});

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

  const raw = {
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
    isActive: formData.get("isActive") === "true",
  };

  const parsed = createUserSchema.safeParse(raw);
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

  const raw = {
    name: formData.get("name"),
    email: formData.get("email"),
    role: formData.get("role"),
    isActive: formData.get("isActive") === "true",
  };

  const parsed = updateUserSchema.safeParse(raw);
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
