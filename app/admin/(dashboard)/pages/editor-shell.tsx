import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SiteHeader } from "@/components/admin/site-header";
import type { Locale } from "@/lib/i18n/config";

export function PagesEditorShell({
  title,
  locale,
  children,
}: {
  title: string;
  locale: Locale;
  children: React.ReactNode;
}) {
  return (
    <>
      <SiteHeader
        title={title}
        actions={
          <div className="inline-flex overflow-hidden rounded-lg border">
            {(["en", "es"] as const).map((value) => (
              <Button
                key={value}
                variant={locale === value ? "default" : "ghost"}
                size="sm"
                className="rounded-none"
                render={<Link href={`?locale=${value}`} />}
              >
                {value.toUpperCase()}
              </Button>
            ))}
          </div>
        }
      />
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="px-4 lg:px-6">{children}</div>
      </div>
    </>
  );
}

export function EditorCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card>
      <CardContent className={`p-6 sm:p-8 ${className}`}>
        {children}
      </CardContent>
    </Card>
  );
}
