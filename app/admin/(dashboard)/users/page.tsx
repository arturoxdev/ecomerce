import Link from "next/link";

import { findAllByStore, UserTable } from "@/features/users";
import { getSessionUser } from "@/lib/services/auth";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/admin/site-header";

export default async function AdminUsersPage() {
  const currentUser = await getSessionUser();

  if (currentUser.role === "EMPLOYEE") {
    return (
      <>
        <SiteHeader title="Users" />
        <div className="flex flex-1 flex-col items-center justify-center py-24">
          <h2 className="text-lg font-medium">Access Denied</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            You do not have permission to view this page.
          </p>
        </div>
      </>
    );
  }

  const userList = await findAllByStore();

  return (
    <>
      <SiteHeader
        title="Users"
        actions={
          <Button size="sm" render={<Link href="/admin/users/new" />}>
            Add user
          </Button>
        }
      />
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="px-4 lg:px-6">
          <UserTable users={userList} currentUserRole={currentUser.role} />
        </div>
      </div>
    </>
  );
}
