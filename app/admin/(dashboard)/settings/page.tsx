import { CreditCard, Palette } from "lucide-react";
import Link from "next/link";

import { SiteHeader } from "@/components/admin/site-header";
import { Card } from "@/components/ui/card";

const sections = [
  {
    href: "/admin/settings/appearance",
    label: "Appearance",
    description: "Choose a theme for the admin panel and the storefront.",
    icon: Palette,
  },
  {
    href: "/admin/settings/payments",
    label: "Payments & delivery",
    description: "Payment mode, delivery, and deposit configuration.",
    icon: CreditCard,
  },
];

export default function AdminSettingsPage() {
  return (
    <>
      <SiteHeader title="Settings" />
      <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <Link key={section.href} href={section.href}>
              <Card className="gap-2 p-5 transition-colors hover:border-primary">
                <div className="flex items-center gap-3">
                  <div className="rounded-md bg-muted p-2">
                    <Icon className="size-5 text-muted-foreground" />
                  </div>
                  <h3 className="text-base font-medium">{section.label}</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  {section.description}
                </p>
              </Card>
            </Link>
          );
        })}
      </div>
    </>
  );
}
