"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getSessionUser } from "@/lib/auth/session";
import { canCreateRole, canEditUser } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { users, sessions, userRoleEnum } from "@/lib/db/schema";

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

import type { FormState } from "@/lib/types/form-state";

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
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  if (!canCreateRole(currentUser.role, parsed.data.role)) {
    return { error: "You cannot assign this role" };
  }

  const existing = await db.query.users.findFirst({
    where: eq(users.email, parsed.data.email),
  });
  if (existing) {
    return { error: "This email is already registered" };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  await db.insert(users).values({
    name: parsed.data.name,
    email: parsed.data.email,
    passwordHash,
    role: parsed.data.role,
    isActive: parsed.data.isActive,
  });

  revalidatePath("/admin/users");
  redirect("/admin/users");
}

export async function updateUser(
  id: string,
  _prev: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  const currentUser = await getSessionUser();

  const targetUser = await db.query.users.findFirst({
    where: eq(users.id, id),
  });
  if (!targetUser) {
    return { error: "User not found" };
  }

  if (targetUser.role === "ROOT") {
    return { error: "Cannot modify the ROOT user" };
  }

  const raw = {
    name: formData.get("name"),
    email: formData.get("email"),
    role: formData.get("role"),
    isActive: formData.get("isActive") === "true",
  };

  const parsed = updateUserSchema.safeParse(raw);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  if (!canEditUser(currentUser.role, targetUser.role)) {
    return { error: "You cannot edit this user" };
  }

  if (parsed.data.role !== targetUser.role && !canCreateRole(currentUser.role, parsed.data.role)) {
    return { error: "You cannot assign this role" };
  }

  if (parsed.data.email !== targetUser.email) {
    const existing = await db.query.users.findFirst({
      where: eq(users.email, parsed.data.email),
    });
    if (existing) {
      return { error: "This email is already registered" };
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
    .where(eq(users.id, id));

  if (!parsed.data.isActive && targetUser.isActive) {
    await db.delete(sessions).where(eq(sessions.userId, id));
  }

  revalidatePath("/admin/users");
  redirect("/admin/users");
}

export async function toggleUserActive(id: string): Promise<UserFormState> {
  const currentUser = await getSessionUser();

  const targetUser = await db.query.users.findFirst({
    where: eq(users.id, id),
  });
  if (!targetUser) {
    return { error: "User not found" };
  }

  if (targetUser.role === "ROOT") {
    return { error: "Cannot deactivate the ROOT user" };
  }

  if (!canEditUser(currentUser.role, targetUser.role)) {
    return { error: "You cannot modify this user" };
  }

  const newActive = !targetUser.isActive;

  await db
    .update(users)
    .set({ isActive: newActive })
    .where(eq(users.id, id));

  if (!newActive) {
    await db.delete(sessions).where(eq(sessions.userId, id));
  }

  revalidatePath("/admin/users");
  return { success: true };
}
