import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { getStoreId } from "@/lib/config/tenant";
import type { UserRole } from "@/lib/db/schema";

export type SessionUser = {
  id: string;
  storeId: string;
  name?: string | null;
  email?: string | null;
  role: UserRole;
};

const ROLE_LEVEL: Record<UserRole, number> = {
  ROOT: 3,
  ADMIN: 2,
  EMPLOYEE: 1,
};

export function canCreateRole(
  currentRole: UserRole,
  targetRole: UserRole,
): boolean {
  if (currentRole === "EMPLOYEE") return false;
  if (currentRole === "ADMIN") return targetRole === "EMPLOYEE";
  if (currentRole === "ROOT") {
    return targetRole === "ADMIN" || targetRole === "EMPLOYEE";
  }
  return false;
}

export function canEditUser(
  currentRole: UserRole,
  targetRole: UserRole,
): boolean {
  return ROLE_LEVEL[currentRole] > ROLE_LEVEL[targetRole];
}

export function canWriteData(role: UserRole): boolean {
  return role !== "EMPLOYEE";
}

export function getAssignableRoles(currentRole: UserRole): UserRole[] {
  if (currentRole === "ROOT") return ["ADMIN", "EMPLOYEE"];
  if (currentRole === "ADMIN") return ["EMPLOYEE"];
  return [];
}

export async function getSessionUser(): Promise<SessionUser> {
  const session = await auth();

  if (!session?.user) {
    redirect("/admin/login");
  }

  return {
    id: session.user.id,
    storeId: getStoreId(),
    name: session.user.name,
    email: session.user.email,
    role: session.user.role,
  };
}

export async function requireWriteAccess(): Promise<SessionUser> {
  const user = await getSessionUser();

  if (!canWriteData(user.role)) {
    throw new Error("Unauthorized: read-only access");
  }

  return user;
}
