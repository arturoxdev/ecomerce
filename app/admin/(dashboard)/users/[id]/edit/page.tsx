import { eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getSessionUser } from "@/lib/auth/session";
import { getAssignableRoles } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

import { updateUser } from "../../actions";
import { UserForm } from "../../user-form";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditUserPage({ params }: Props) {
  const { id } = await params;
  const currentUser = await getSessionUser();
  const assignableRoles = getAssignableRoles(currentUser.role);

  const user = await db.query.users.findFirst({
    where: eq(users.id, id),
  });

  if (!user) notFound();

  if (user.role === "ROOT") {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <h1 className="text-2xl font-bold text-gray-900">Cannot Edit</h1>
        <p className="mt-2 text-gray-500">The ROOT user cannot be modified.</p>
      </div>
    );
  }

  const boundUpdate = updateUser.bind(null, id);

  return (
    <div>
      <Link
        href="/admin/users"
        className="mb-4 inline-block text-sm text-gray-500 hover:text-gray-700"
      >
        ← Back to users
      </Link>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">
        Edit User — {user.name ?? user.email}
      </h1>
      <div className="max-w-lg rounded-lg border border-gray-200 bg-white p-6">
        <UserForm
          action={boundUpdate}
          assignableRoles={assignableRoles}
          user={{
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            isActive: user.isActive,
          }}
        />
      </div>
    </div>
  );
}
