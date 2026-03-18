import { asc } from "drizzle-orm";
import Link from "next/link";

import { getSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

import { UserTable } from "./user-table";

export default async function AdminUsersPage() {
  const currentUser = await getSessionUser();

  if (currentUser.role === "EMPLOYEE") {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
        <p className="mt-2 text-gray-500">You do not have permission to view this page.</p>
      </div>
    );
  }

  const userList = await db.query.users.findMany({
    orderBy: asc(users.createdAt),
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        <Link
          href="/admin/users/new"
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
        >
          Add user
        </Link>
      </div>

      <UserTable users={userList} currentUserRole={currentUser.role} />
    </div>
  );
}
