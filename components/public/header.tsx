"use client";

import { ChevronDown, Menu, PartyPopper, ShoppingCart, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Suspense } from "react";

import { LocaleSwitcher } from "@/components/locale-switcher";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { useCartCount } from "@/hooks/use-cart-count";
import { siteConfig } from "@/lib/config/site";
import type { Locale } from "@/lib/i18n/config";

type Messages = {
  nav: { home: string; catalogue: string; about: string; contact: string; bookNow: string; cart: string };
  language: { label: string };
};

type Category = { name: string; slug: string };

type Props = {
  locale: Locale;
  messages: Messages;
  categories: Category[];
};

const linkClass =
  "text-sm font-medium text-slate-600 transition-colors hover:text-primary";

export function PublicHeader({ locale, messages: m, categories }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const cartCount = useCartCount();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#fed7aa]/25 bg-[#f8f7f5]/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href={`/${locale}`} className="flex items-center gap-2">
          {siteConfig.logoUrl ? (
            <img
              src={siteConfig.logoUrl}
              alt={siteConfig.name}
              className="size-8 rounded-lg object-contain"
            />
          ) : (
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-white">
              <PartyPopper className="size-4" />
            </div>
          )}
          <span className="text-xl font-bold tracking-tight text-slate-900">
            {siteConfig.name}
          </span>
        </Link>

        {/* Desktop Navigation */}
        <NavigationMenu className="hidden md:flex">
          <NavigationMenuList className="gap-2">
            <NavigationMenuItem>
              <NavigationMenuLink href={`/${locale}`} className={linkClass}>
                {m.nav.home}
              </NavigationMenuLink>
            </NavigationMenuItem>

            <NavigationMenuItem>
              <NavigationMenuTrigger className={linkClass}>
                <Link href={`/${locale}/catalog`}>{m.nav.catalogue}</Link>
              </NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className="grid w-[240px] gap-1 p-2">
                  <li>
                    <NavigationMenuLink
                      href={`/${locale}/catalog`}
                      className="block rounded-md px-3 py-2 text-sm font-semibold text-slate-900 transition-colors hover:bg-orange-50 hover:text-primary"
                    >
                      {m.nav.catalogue}
                    </NavigationMenuLink>
                  </li>
                  {categories.map((cat) => (
                    <li key={cat.slug}>
                      <NavigationMenuLink
                        href={`/${locale}/${cat.slug}`}
                        className="block rounded-md px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-orange-50 hover:text-primary"
                      >
                        {cat.name}
                      </NavigationMenuLink>
                    </li>
                  ))}
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>

            <NavigationMenuItem>
              <NavigationMenuLink href={`/${locale}/about`} className={linkClass}>
                {m.nav.about}
              </NavigationMenuLink>
            </NavigationMenuItem>

            <NavigationMenuItem>
              <NavigationMenuLink href={`/${locale}/contact`} className={linkClass}>
                {m.nav.contact}
              </NavigationMenuLink>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>

        <div className="flex items-center gap-3">
          <Link
            href={`/${locale}/cart`}
            className="relative p-2 text-slate-600 transition-colors hover:text-primary"
            aria-label={m.nav.cart}
          >
            <ShoppingCart className="size-5" />
            {cartCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex size-4.5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            )}
          </Link>
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

      {/* Mobile Navigation */}
      {mobileOpen && (
        <div className="border-t border-[#fed7aa]/25 bg-[#f8f7f5] px-4 pb-4 pt-2 md:hidden">
          <nav className="flex flex-col gap-2">
            <Link
              href={`/${locale}`}
              onClick={() => setMobileOpen(false)}
              className="rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-primary"
            >
              {m.nav.home}
            </Link>

            {/* Catalogue with expandable categories */}
            <button
              onClick={() => setCatalogOpen(!catalogOpen)}
              className="flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-primary"
            >
              {m.nav.catalogue}
              <ChevronDown
                className={`size-4 transition-transform ${catalogOpen ? "rotate-180" : ""}`}
              />
            </button>
            {catalogOpen && (
              <div className="flex flex-col gap-1 pl-4">
                <Link
                  href={`/${locale}/catalog`}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-md px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:text-primary"
                >
                  {m.nav.catalogue}
                </Link>
                {categories.map((cat) => (
                  <Link
                    key={cat.slug}
                    href={`/${locale}/${cat.slug}`}
                    onClick={() => setMobileOpen(false)}
                    className="rounded-md px-3 py-2 text-sm text-slate-500 transition-colors hover:bg-slate-50 hover:text-primary"
                  >
                    {cat.name}
                  </Link>
                ))}
              </div>
            )}

            <Link
              href={`/${locale}/about`}
              onClick={() => setMobileOpen(false)}
              className="rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-primary"
            >
              {m.nav.about}
            </Link>
            <Link
              href={`/${locale}/contact`}
              onClick={() => setMobileOpen(false)}
              className="rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-primary"
            >
              {m.nav.contact}
            </Link>
            <Link
              href={`/${locale}/cart`}
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-primary"
            >
              <ShoppingCart className="size-4" />
              {m.nav.cart}
              {cartCount > 0 && (
                <span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-white">
                  {cartCount}
                </span>
              )}
            </Link>
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
