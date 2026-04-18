import { getAssignableRoles, getSessionUser } from "@/lib/services/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SiteHeader } from "@/components/admin/site-header";

import { createUser, UserForm } from "@/features/users";

export default async function NewUserPage() {
  const currentUser = await getSessionUser();
  const assignableRoles = getAssignableRoles(currentUser.role);

  if (assignableRoles.length === 0) {
    return (
      <>
        <SiteHeader title="New User" />
        <div className="flex flex-1 flex-col items-center justify-center py-24">
          <h2 className="text-lg font-medium">Access Denied</h2>
          <p className="mt-2 text-sm text-muted-foreground">You cannot create users.</p>
        </div>
      </>
    );
  }

  return (
    <>
      <SiteHeader title="New User" />
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="mx-auto w-full max-w-lg px-4 lg:px-6">
          <Card>
            <CardHeader>
              <CardTitle>User details</CardTitle>
              <CardDescription>
                Create a new admin panel user.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UserForm action={createUser} assignableRoles={assignableRoles} />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
