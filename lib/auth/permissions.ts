import type { UserRole } from "@/lib/db/schema";

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
  if (currentRole === "ROOT")
    return targetRole === "ADMIN" || targetRole === "EMPLOYEE";
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
