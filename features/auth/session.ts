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

  if (user.role === "EMPLOYEE") {
    throw new Error("Unauthorized: read-only access");
  }

  return user;
}
