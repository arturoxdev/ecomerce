import { notFound } from "next/navigation";

import { updateUser, UserForm, findUserById as findById } from "@/features/users";
import { getAssignableRoles, getSessionUser } from "@/lib/services/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SiteHeader } from "@/components/admin/site-header";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditUserPage({ params }: Props) {
  const { id } = await params;
  const currentUser = await getSessionUser();
  const assignableRoles = getAssignableRoles(currentUser.role);

  const user = await findById(id);

  if (!user) notFound();

  if (user.role === "ROOT") {
    return (
      <>
        <SiteHeader title="Edit User" />
        <div className="flex flex-1 flex-col items-center justify-center py-24">
          <h2 className="text-lg font-medium">Cannot Edit</h2>
          <p className="mt-2 text-sm text-muted-foreground">The ROOT user cannot be modified.</p>
        </div>
      </>
    );
  }

  const boundUpdate = updateUser.bind(null, id);

  return (
    <>
      <SiteHeader title={`Edit User — ${user.name ?? user.email}`} />
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="mx-auto w-full max-w-lg px-4 lg:px-6">
          <Card>
            <CardHeader>
              <CardTitle>User details</CardTitle>
              <CardDescription>
                Update this user&apos;s information and permissions.
              </CardDescription>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
