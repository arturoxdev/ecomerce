import { asc } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PublicFooter } from "@/components/public/footer";
import { PublicHeader } from "@/components/public/header";
import { siteConfig } from "@/lib/config/site";
import { categories as categoriesTable } from "@/lib/db/schema";
import { isLocale, locales, type Locale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";
import { findAll as findAllCategories } from "@/lib/data/categories";

function interpolate(text: string): string {
  return text
    .replace(/\{\{siteName\}\}/g, siteConfig.name)
    .replace(/\{\{year\}\}/g, new Date().getFullYear().toString());
}

type LocaleLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export async function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) {
    return {};
  }

  const messages = getMessages(locale as Locale);
  const title = interpolate(messages.meta.title);
  const description = interpolate(messages.meta.description);
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      locale: locale === "en" ? "en_US" : "es_MX",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const typedLocale = locale as Locale;
  const messages = getMessages(typedLocale);
  const cats = await findAllCategories({
    columns: { name: true, slug: true },
    orderBy: asc(categoriesTable.sortOrder),
  });

  return (
    <div lang={locale} className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-[#f8f7f5] font-display text-slate-900 antialiased">
      <PublicHeader locale={typedLocale} messages={messages} categories={cats} />
      <main className="flex-1">{children}</main>
      <PublicFooter
        locale={typedLocale}
        rights={interpolate(messages.footer.rights)}
        links={messages.footer.links}
      />
    </div>
  );
}
