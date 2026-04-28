import Link from "next/link";
import { Plus } from "lucide-react";

import { findAllByStore, UserTable } from "@/features/users";
import { getSessionUser } from "@/lib/services/auth";
import { Button } from "@/components/ui/button";
import { SearchFilter } from "@/components/admin/search-filter";
import { SiteHeader } from "@/components/admin/site-header";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; role?: string }>;
}) {
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

  const { search, role } = await searchParams;
  const all = await findAllByStore();

  const filtered = all.filter((u) => {
    if (role && role !== "all" && u.role !== role) return false;
    if (search) {
      const q = search.toLowerCase();
      const name = (u.name ?? "").toLowerCase();
      const email = u.email.toLowerCase();
      if (!name.includes(q) && !email.includes(q)) return false;
    }
    return true;
  });

  const activeCount = all.filter((u) => u.isActive).length;

  return (
    <>
      <SiteHeader
        title="Users"
        subtitle={`${all.length} user${all.length === 1 ? "" : "s"} · ${activeCount} active`}
        actions={
          <Button
            variant="cta"
            className="h-8 gap-1.5 rounded-md px-3.5 text-[13px] font-semibold"
            render={<Link href="/admin/users/new" />}
          >
            <Plus className="size-3.5" strokeWidth={2.4} />
            Add user
          </Button>
        }
      />
      <div className="flex flex-col gap-3.5 px-7 pt-5 pb-7">
        <SearchFilter placeholder="Search user…" width={320} />
        <UserTable users={filtered} currentUserRole={currentUser.role} />
      </div>
    </>
  );
}
