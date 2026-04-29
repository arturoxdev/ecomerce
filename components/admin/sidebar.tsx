"use client";

import {
  Calendar,
  ChevronsUpDown,
  FileText,
  FolderOpen,
  LogOut,
  MapPin,
  Package,
  Sparkles,
  Settings,
  ShoppingBag,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";

import { logoutAdmin } from "@/app/admin/(dashboard)/actions";
import type { UserRole } from "@/lib/db/schema";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { siteConfig } from "@/lib/config/site";

type NavItem = {
  href: string;
  label: string;
  icon: typeof Package;
  roles?: UserRole[];
};

const mainNavItems: NavItem[] = [
  { href: "/admin/products", label: "Productos", icon: Package },
  { href: "/admin/categories", label: "Categorías", icon: FolderOpen },
  { href: "/admin/users", label: "Usuarios", icon: Users, roles: ["ROOT", "ADMIN"] },
  { href: "/admin/orders", label: "Órdenes", icon: ShoppingBag },
  { href: "/admin/calendar", label: "Calendario", icon: Calendar },
  { href: "/admin/pages", label: "Páginas", icon: FileText },
  {
    href: "/admin/zipcodes",
    label: "Códigos postales",
    icon: MapPin,
    roles: ["ROOT", "ADMIN"],
  },
];

const secondaryNavItems: NavItem[] = [
  { href: "/admin/settings", label: "Ajustes", icon: Settings },
];

const groupLabelClass =
  "px-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground";

type Props = {
  userRole?: UserRole;
  userName?: string;
  userEmail?: string;
};

export function AdminSidebar({
  userRole = "EMPLOYEE",
  userName,
  userEmail,
}: Props) {
  const pathname = usePathname();
  const logoutFormRef = useRef<HTMLFormElement>(null);

  const visibleMainItems = mainNavItems.filter(
    (item) => !item.roles || item.roles.includes(userRole),
  );

  const initials = userName
    ? userName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  const adminTitle = siteConfig.adminTitle;
  const titleParts = adminTitle.split(/[·•]/);
  const titleHead = titleParts[0]?.trim() ?? adminTitle;
  const titleTail = titleParts[1]?.trim();

  return (
    <Sidebar collapsible="offcanvas" className="border-r border-border">
      <SidebarHeader className="px-3.5 pt-4 pb-5">
        <div className="flex items-center gap-2.5 px-1">
          <div className="grid size-[26px] place-items-center rounded-md bg-foreground text-background">
            <Sparkles className="size-3.5" strokeWidth={2} />
          </div>
          <div className="text-[15px] font-bold tracking-tight text-foreground">
            {titleHead}
            {titleTail && (
              <span className="font-medium text-muted-foreground">
                {`·${titleTail}`}
              </span>
            )}
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2.5">
        <SidebarGroup className="p-0 pb-2">
          <SidebarGroupLabel className={groupLabelClass}>
            Navegación
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {visibleMainItems.map(({ href, label, icon: Icon }) => (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton
                    isActive={pathname.startsWith(href)}
                    tooltip={label}
                    render={<Link href={href} />}
                  >
                    <Icon />
                    <span>{label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto p-0">
          <SidebarGroupLabel className={groupLabelClass}>
            Soporte
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {secondaryNavItems.map(({ href, label, icon: Icon }) => (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton
                    isActive={pathname.startsWith(href)}
                    tooltip={label}
                    render={<Link href={href} />}
                  >
                    <Icon />
                    <span>{label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border px-3 pt-3 pb-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger
                className="w-full rounded-md focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-sidebar-accent"
                render={
                  <button className="flex w-full items-center gap-2.5 rounded-md p-1 text-left transition-colors hover:bg-sidebar-accent" />
                }
              >
                <div className="grid size-7 shrink-0 place-items-center rounded-md bg-secondary text-[12px] font-bold text-secondary-foreground">
                  {initials}
                </div>
                <div className="grid min-w-0 flex-1 text-left leading-tight">
                  <span className="truncate text-[12.5px] font-semibold text-foreground">
                    {userName ?? "Usuario"}
                  </span>
                  <span className="truncate text-[10.5px] text-muted-foreground">
                    {userEmail ?? ""}
                  </span>
                </div>
                <ChevronsUpDown className="size-3.5 text-muted-foreground" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="min-w-56 rounded-lg"
                align="end"
                side="top"
                sideOffset={4}
              >
                <DropdownMenuItem
                  data-testid="logout-button"
                  onSelect={() => logoutFormRef.current?.requestSubmit()}
                >
                  <LogOut />
                  Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <form
              ref={logoutFormRef}
              action={logoutAdmin}
              className="hidden"
            />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
