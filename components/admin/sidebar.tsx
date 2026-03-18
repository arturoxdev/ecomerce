"use client";

import {
  Calendar,
  FileText,
  FolderOpen,
  LogOut,
  Package,
  PartyPopper,
  Settings,
  ShoppingBag,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { logoutAdmin } from "@/app/admin/(dashboard)/actions";
import type { UserRole } from "@/lib/db/schema";

type NavItem = {
  href: string;
  label: string;
  icon: typeof Package;
  roles?: UserRole[];
};

const navItems: NavItem[] = [
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/categories", label: "Categories", icon: FolderOpen },
  { href: "/admin/users", label: "Users", icon: Users, roles: ["ROOT", "ADMIN"] },
  { href: "/admin/orders", label: "Orders", icon: ShoppingBag },
  { href: "/admin/calendar", label: "Calendar", icon: Calendar },
  { href: "/admin/pages", label: "Pages", icon: FileText },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

type Props = {
  userRole?: UserRole;
};

export function AdminSidebar({ userRole = "EMPLOYEE" }: Props) {
  const pathname = usePathname();

  const visibleItems = navItems.filter(
    (item) => !item.roles || item.roles.includes(userRole),
  );

  return (
    <aside className="flex h-screen w-60 flex-col bg-[#1a1410] text-white">
      {/* Header */}
      <div className="flex items-center gap-2.5 border-b border-white/10 px-5 py-4">
        <div className="flex size-7 items-center justify-center rounded-md bg-white/10">
          <PartyPopper className="size-4 text-white" />
        </div>
        <span className="font-bold tracking-tight">Aurora Admin</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4">
        {visibleItems.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-white/10 text-white"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-white/10 px-3 py-4">
        <form action={logoutAdmin}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
          >
            <LogOut className="size-4" />
            Logout
          </button>
        </form>
      </div>
    </aside>
  );
}
