import { TooltipProvider } from "@/components/ui/tooltip";
import { AdminSidebar } from "@/components/admin/sidebar";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { getSessionUser } from "@/lib/services/auth";
import { getThemeId } from "@/lib/data/settings";
import { getThemeById, serializeTheme } from "@/lib/themes";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, themeId] = await Promise.all([getSessionUser(), getThemeId()]);
  const theme = getThemeById(themeId);

  return (
    <TooltipProvider>
      <style dangerouslySetInnerHTML={{ __html: serializeTheme(theme) }} />
      <SidebarProvider
        style={
          {
            "--sidebar-width": "calc(var(--spacing) * 56)",
            "--header-height": "calc(var(--spacing) * 12)",
          } as React.CSSProperties
        }
      >
        <AdminSidebar
          userRole={user.role}
          userName={user.name ?? ""}
          userEmail={user.email ?? ""}
        />
        <SidebarInset>
          <div className="flex flex-1 flex-col">
            <div className="@container/main flex flex-1 flex-col gap-2">
              {children}
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
