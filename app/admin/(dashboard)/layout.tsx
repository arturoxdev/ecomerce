import { Toaster } from "@/components/ui/sonner";
import { AdminSidebar } from "@/components/admin/sidebar";
import { getSessionUser } from "@/lib/auth/session";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();

  return (
    <div className="flex min-h-screen">
      <AdminSidebar userRole={user.role} />
      <main className="flex-1 bg-[#f8f7f5] p-8">{children}</main>
      <Toaster />
    </div>
  );
}
