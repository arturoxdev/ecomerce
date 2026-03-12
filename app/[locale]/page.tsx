import {
  BadgeCheck,
  CalendarDays,
  Facebook,
  Instagram,
  Menu,
  PartyPopper,
  Ruler,
  Truck,
  Utensils,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { LocaleSwitcher } from "@/components/locale-switcher";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";

type HomeProps = {
  params: Promise<{ locale: string }>;
};

export default async function Home({ params }: HomeProps) {
  const { locale } = await params;
  if (!isLocale(locale)) {
    notFound();
  }

  const typedLocale = locale as Locale;
  const m = getMessages(typedLocale);

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-white font-display text-slate-900 antialiased">
      <header className="sticky top-0 z-50 w-full border-b border-orange-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-white">
              <PartyPopper className="size-4" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">
              Festejos Aurora
            </span>
          </div>

          <nav className="hidden items-center gap-8 md:flex">
            <Link
              className="text-sm font-medium text-slate-600 transition-colors hover:text-primary"
              href={`/${typedLocale}`}
            >
              {m.nav.home}
            </Link>
            <Link
              className="text-sm font-medium text-slate-600 transition-colors hover:text-primary"
              href={`/${typedLocale}/catalog`}
            >
              {m.nav.catalogue}
            </Link>
            <a
              className="text-sm font-medium text-slate-600 transition-colors hover:text-primary"
              href="#"
            >
              {m.nav.about}
            </a>
            <a
              className="text-sm font-medium text-slate-600 transition-colors hover:text-primary"
              href="#"
            >
              {m.nav.contact}
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Suspense fallback={<div className="h-8 w-[92px]" />}>
              <LocaleSwitcher currentLocale={typedLocale} label={m.language.label} />
            </Suspense>
            <button className="hidden items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white shadow-sm transition-all hover:bg-orange-600 sm:flex">
              {m.nav.bookNow}
            </button>
            <button className="p-2 text-slate-600 md:hidden">
              <Menu className="size-5" />
            </button>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden py-12 sm:py-16 lg:py-20 xl:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div className="max-w-2xl">
              <div className="mb-6 inline-flex items-center rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-sm font-medium text-primary">
                <span className="mr-2 flex size-2 rounded-full bg-primary" />
                {m.hero.badge}
              </div>
              <h1 className="mb-6 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
                {m.hero.titleStart}{" "}
                <span className="relative inline-block text-primary">
                  {m.hero.titleHighlight}
                </span>
              </h1>
              <p className="mb-8 max-w-lg text-lg text-slate-600">
                {m.hero.description}
              </p>
              <div className="flex flex-col gap-4 sm:flex-row">
                <Link
                  href={`/${typedLocale}/catalog`}
                  className="inline-flex items-center justify-center rounded-lg bg-secondary px-6 py-3.5 text-base font-bold text-white shadow-sm transition-all hover:bg-green-800"
                >
                  <CalendarDays className="mr-2 size-5" />
                  {m.hero.primaryCta}
                </Link>
                <button className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-6 py-3.5 text-base font-bold text-slate-900 shadow-sm transition-all hover:bg-slate-50">
                  {m.hero.secondaryCta}
                </button>
              </div>
              <p className="mt-8 text-sm text-slate-500">{m.hero.trusted}</p>
            </div>

            <div className="relative w-full">
              <div className="aspect-[4/3] w-full overflow-hidden rounded-2xl bg-slate-100 shadow-2xl">
                <div
                  className="h-full w-full bg-cover bg-center"
                  style={{
                    backgroundImage:
                      "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCWQyE9DMg-JDkm060LzSQqQ2STADSY1PSRyBso20F6UfgOrYYyfTGz0UYRmvgQilpWxSMynslYC6gXD48d6oFNC8-lC7FAHN0uQeizdgkJE4imQ6I4d-apMwbW8aiPU60-OFjPstMwtZi-fsmpiRD_6c59p4f7WNAUJU7lwYdyfsW-UYhr1-XH5NFAUVmB7P1D7Y5YOSjunk3Hy0ne5yzgtqcMQLcUpw04tr2K-_seDR3Xtv0lmhIx05dHSizEREp582Nk4xlQcDVA')",
                  }}
                />
              </div>
              <div className="absolute -bottom-5 -left-5 hidden rounded-xl border border-slate-100 bg-white p-4 shadow-xl sm:block">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-full bg-green-100 text-green-600">
                    <BadgeCheck className="size-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      {m.hero.safetyTitle}
                    </p>
                    <p className="text-xs text-slate-500">{m.hero.safetySubtitle}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                {m.equipment.title}
              </h2>
              <p className="mt-2 text-slate-600">{m.equipment.description}</p>
            </div>
            <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0">
              <button className="whitespace-nowrap rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white">
                {m.equipment.filters.all}
              </button>
              <button className="whitespace-nowrap rounded-full bg-slate-100 px-5 py-2 text-sm font-semibold text-slate-600">
                {m.equipment.filters.bounce}
              </button>
              <button className="whitespace-nowrap rounded-full bg-slate-100 px-5 py-2 text-sm font-semibold text-slate-600">
                {m.equipment.filters.tables}
              </button>
              <button className="whitespace-nowrap rounded-full bg-slate-100 px-5 py-2 text-sm font-semibold text-slate-600">
                {m.equipment.filters.concessions}
              </button>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {m.products.map((product) => (
              <div
                className="group relative rounded-xl border border-slate-100 bg-background-light p-4 shadow-sm transition-all duration-300 hover:shadow-lg"
                key={product.title}
              >
                <div className="aspect-[4/3] w-full overflow-hidden rounded-lg bg-slate-200" />
                <div className="mt-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">{product.title}</h3>
                      <p className="text-sm text-slate-500">{product.subtitle}</p>
                    </div>
                    <span className="rounded-md bg-orange-100 px-2 py-1 text-xs font-bold text-primary">
                      {product.price}
                    </span>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <Ruler className="size-4" />
                      {product.meta}
                    </div>
                    <button className="rounded-lg bg-secondary px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-green-800">
                      {product.book}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative isolate overflow-hidden bg-white py-16 sm:py-24">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-6 lg:grid-cols-2 lg:px-8">
          <div className="max-w-xl">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              {m.cta.title}
            </h2>
            <p className="mt-4 text-lg leading-8 text-slate-600">{m.cta.description}</p>
            <div className="mt-6 flex max-w-md gap-x-4">
              <label className="sr-only" htmlFor="email-address">
                Email
              </label>
              <input
                autoComplete="email"
                className="min-w-0 flex-auto rounded-md border-0 px-3.5 py-2 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300"
                id="email-address"
                name="email"
                placeholder={m.cta.inputPlaceholder}
                required
                type="email"
              />
              <button
                className="flex-none rounded-md bg-primary px-3.5 py-2.5 text-sm font-semibold text-white hover:bg-orange-600"
                type="submit"
              >
                {m.cta.button}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
            <div className="flex flex-col items-start">
              <div className="rounded-md bg-white p-2 ring-1 ring-slate-200">
                <Truck className="size-6 text-primary" />
              </div>
              <dt className="mt-4 font-semibold text-slate-900">{m.cta.feature1Title}</dt>
              <dd className="mt-2 leading-7 text-slate-600">{m.cta.feature1Desc}</dd>
            </div>
            <div className="flex flex-col items-start">
              <div className="rounded-md bg-white p-2 ring-1 ring-slate-200">
                <Utensils className="size-6 text-primary" />
              </div>
              <dt className="mt-4 font-semibold text-slate-900">{m.cta.feature2Title}</dt>
              <dd className="mt-2 leading-7 text-slate-600">{m.cta.feature2Desc}</dd>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 md:flex md:items-center md:justify-between lg:px-8">
          <div className="flex justify-center space-x-6 md:order-2">
            <a className="text-slate-400 hover:text-slate-500" href="#">
              <span className="sr-only">Facebook</span>
              <Facebook aria-hidden="true" className="h-6 w-6" />
            </a>
            <a className="text-slate-400 hover:text-slate-500" href="#">
              <span className="sr-only">Instagram</span>
              <Instagram aria-hidden="true" className="h-6 w-6" />
            </a>
          </div>
          <div className="mt-8 md:order-1 md:mt-0">
            <p className="text-center text-xs leading-5 text-slate-500">
              {m.footer.rights}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
