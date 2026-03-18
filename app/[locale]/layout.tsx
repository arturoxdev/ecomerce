import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PublicFooter } from "@/components/public/footer";
import { PublicHeader } from "@/components/public/header";
import { isLocale, locales, type Locale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";

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
  return {
    title: messages.meta.title,
    description: messages.meta.description,
    openGraph: {
      title: messages.meta.title,
      description: messages.meta.description,
      type: "website",
      locale: locale === "en" ? "en_US" : "es_MX",
    },
    twitter: {
      card: "summary_large_image",
      title: messages.meta.title,
      description: messages.meta.description,
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

  return (
    <div lang={locale} className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-[#f8f7f5] font-display text-slate-900 antialiased">
      <PublicHeader locale={typedLocale} messages={messages} />
      <main className="flex-1">{children}</main>
      <PublicFooter rights={messages.footer.rights} />
    </div>
  );
}
