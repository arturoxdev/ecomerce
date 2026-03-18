import Link from "next/link";

import { getSessionUser } from "@/lib/auth/session";
import { getAssignableRoles } from "@/lib/auth/permissions";

import { createUser } from "../actions";
import { UserForm } from "../user-form";

export default async function NewUserPage() {
  const currentUser = await getSessionUser();
  const assignableRoles = getAssignableRoles(currentUser.role);

  if (assignableRoles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
        <p className="mt-2 text-gray-500">You cannot create users.</p>
      </div>
    );
  }

  return (
    <div>
      <Link
        href="/admin/users"
        className="mb-4 inline-block text-sm text-gray-500 hover:text-gray-700"
      >
        ← Back to users
      </Link>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">New User</h1>
      <div className="max-w-lg rounded-lg border border-gray-200 bg-white p-6">
        <UserForm action={createUser} assignableRoles={assignableRoles} />
      </div>
    </div>
  );
}
