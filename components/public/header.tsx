"use client";

import { Menu, PartyPopper, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Suspense } from "react";

import { LocaleSwitcher } from "@/components/locale-switcher";
import type { Locale } from "@/lib/i18n/config";

type Messages = {
  nav: { home: string; catalogue: string; about: string; contact: string; bookNow: string };
  language: { label: string };
};

type Props = {
  locale: Locale;
  messages: Messages;
};

export function PublicHeader({ locale, messages: m }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = [
    { href: `/${locale}`, label: m.nav.home },
    { href: `/${locale}/catalog`, label: m.nav.catalogue },
    { href: `/${locale}/about`, label: m.nav.about },
    { href: `/${locale}/contact`, label: m.nav.contact },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#fed7aa]/25 bg-[#f8f7f5]/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href={`/${locale}`} className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-white">
            <PartyPopper className="size-4" />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900">
            Festejos Aurora
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              className="text-sm font-medium text-slate-600 transition-colors hover:text-primary"
              href={link.href}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Suspense fallback={<div className="h-8 w-[92px]" />}>
            <LocaleSwitcher currentLocale={locale} label={m.language.label} />
          </Suspense>
          <Link
            href={`/${locale}/catalog`}
            className="hidden items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white shadow-sm transition-all hover:bg-orange-600 sm:flex"
          >
            {m.nav.bookNow}
          </Link>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 text-slate-600 md:hidden"
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-[#fed7aa]/25 bg-[#f8f7f5] px-4 pb-4 pt-2 md:hidden">
          <nav className="flex flex-col gap-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-primary"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href={`/${locale}/catalog`}
              onClick={() => setMobileOpen(false)}
              className="mt-2 flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white shadow-sm"
            >
              {m.nav.bookNow}
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
