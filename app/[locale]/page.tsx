import {
  BadgeCheck,
  CalendarDays,
  Ruler,
  Truck,
  Utensils,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { asc } from "drizzle-orm";

import { isLocale, type Locale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";
import * as categoryRepo from "@/lib/repositories/category";
import * as productRepo from "@/lib/repositories/product";
import { categories as categoriesTable } from "@/lib/db/schema";

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

  const [dbCategories, dbProducts] = await Promise.all([
    categoryRepo.findAll({ orderBy: asc(categoriesTable.sortOrder), limit: 6 }),
    productRepo.findAllWithCategory({
      where: { isActive: true },
      limit: 6,
    }),
  ]);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div className="max-w-2xl">
              <div className="mb-6 inline-flex items-center rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-sm font-medium text-primary">
                <span className="mr-2 flex size-2 rounded-full bg-primary" />
                {m.hero.badge}
              </div>
              <h1 className="mb-6 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-[60px] lg:leading-[1.1]">
                {m.hero.titleStart}{" "}
                <span className="relative inline-block text-primary">
                  {m.hero.titleHighlight}
                  <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 200 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2 8c40-6 80-6 120-2s56 4 76-2" stroke="#fdba74" strokeWidth="3" strokeLinecap="round" strokeOpacity="0.7" />
                  </svg>
                </span>
              </h1>
              <p className="mb-8 max-w-[480px] text-lg text-slate-600">
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
                <Link
                  href={`/${typedLocale}/contact`}
                  className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-6 py-3.5 text-base font-bold text-slate-900 shadow-sm transition-all hover:bg-slate-50"
                >
                  {m.hero.secondaryCta}
                </Link>
              </div>
              <div className="mt-8 flex items-center gap-3">
                <div className="flex -space-x-2">
                  <div className="size-8 rounded-full border-2 border-white bg-orange-200" />
                  <div className="size-8 rounded-full border-2 border-white bg-green-200" />
                  <div className="size-8 rounded-full border-2 border-white bg-blue-200" />
                </div>
                <p className="text-sm text-slate-500">{m.hero.trusted}</p>
              </div>
            </div>

            <div className="relative w-full">
              <div className="relative h-[440px] w-full overflow-hidden rounded-2xl bg-slate-100 shadow-[0_25px_50px_rgba(0,0,0,0.24)]">
                <div
                  className="h-full w-full bg-cover bg-center"
                  style={{
                    backgroundImage:
                      "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCWQyE9DMg-JDkm060LzSQqQ2STADSY1PSRyBso20F6UfgOrYYyfTGz0UYRmvgQilpWxSMynslYC6gXD48d6oFNC8-lC7FAHN0uQeizdgkJE4imQ6I4d-apMwbW8aiPU60-OFjPstMwtZi-fsmpiRD_6c59p4f7WNAUJU7lwYdyfsW-UYhr1-XH5NFAUVmB7P1D7Y5YOSjunk3Hy0ne5yzgtqcMQLcUpw04tr2K-_seDR3Xtv0lmhIx05dHSizEREp582Nk4xlQcDVA')",
                  }}
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#0000001A] to-transparent" />
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

      {/* Equipment from DB */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-20">
          <div className="mb-12 flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                {m.equipment.title}
              </h2>
              <p className="mt-2 text-slate-600">{m.equipment.description}</p>
            </div>
            <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0">
              <Link
                href={`/${typedLocale}/catalog`}
                className="whitespace-nowrap rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white shadow-sm"
              >
                {m.equipment.filters.all}
              </Link>
              {dbCategories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/${typedLocale}/catalog/${cat.slug}`}
                  className="whitespace-nowrap rounded-full bg-[#f1f5f9] px-5 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-200"
                >
                  {cat.name}
                </Link>
              ))}
            </div>
          </div>

          {/* Masonry Grid - 3 columns with varying image heights */}
          <div className="flex flex-col gap-6 md:flex-row">
            {[0, 1, 2].map((colIndex) => {
              const heightPatterns = [
                [280, 440],
                [380, 280],
                [200, 380],
              ];
              const colProducts = dbProducts.filter(
                (_, i) => i % 3 === colIndex
              );
              return (
                <div key={colIndex} className="flex flex-1 flex-col gap-6">
                  {colProducts.map((product, rowIndex) => {
                    const photo = product.photos?.[0];
                    const priceLabel =
                      product.priceType === "PER_UNIT"
                        ? `$${product.basePrice}/unit`
                        : `$${product.basePrice}/day`;
                    const imgHeight =
                      heightPatterns[colIndex]?.[rowIndex] ?? 280;

                    return (
                      <Link
                        href={`/${typedLocale}/catalog/${product.category.slug}/${product.slug}`}
                        className="group rounded-xl border border-[#f1f5f9] bg-[#f8f7f5] p-4 transition-all duration-300 hover:shadow-lg"
                        key={product.id}
                      >
                        <div
                          className="w-full overflow-hidden rounded-lg bg-slate-200"
                          style={{ height: imgHeight }}
                        >
                          {photo && (
                            <img
                              src={photo}
                              alt={product.name}
                              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                          )}
                        </div>
                        <div className="mt-4 flex items-start justify-between gap-3">
                          <div>
                            <h3 className="text-lg font-bold text-[#0f172a]">
                              {product.name}
                            </h3>
                            <p className="text-sm text-[#64748b]">
                              {product.category.name}
                            </p>
                          </div>
                          <span className="rounded-md bg-[#fff7ed] px-2 py-1 text-xs font-bold text-primary">
                            {priceLabel}
                          </span>
                        </div>
                        <div className="mt-4 flex items-center justify-between">
                          <div className="flex items-center gap-1 text-xs text-[#64748b]">
                            <Ruler className="size-3.5" />
                            {product.priceType === "PER_UNIT"
                              ? `${product.stock} available`
                              : `Stock: ${product.stock}`}
                          </div>
                          <span className="rounded-lg bg-[#2d6a4f] px-4 py-2 text-sm font-bold text-white">
                            {typedLocale === "es" ? "Reservar" : "Reserve"}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative isolate overflow-hidden bg-white py-16">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_#f28b0d30_0%,_#ffdbb020_40%,_transparent_70%)]" />
        <div className="relative mx-auto grid max-w-7xl grid-cols-1 gap-12 px-6 lg:grid-cols-2 lg:px-20">
          <div className="max-w-xl">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              {m.cta.title}
            </h2>
            <p className="mt-4 text-lg leading-8 text-slate-600">{m.cta.description}</p>
            <div className="mt-6 flex max-w-[420px] gap-x-4">
              <label className="sr-only" htmlFor="email-address">
                Email
              </label>
              <input
                autoComplete="email"
                className="min-w-0 flex-auto rounded-md border border-[#cbd5e1] px-3.5 py-2 text-slate-900 shadow-sm ring-0"
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
              <div className="rounded-md bg-white p-2 border border-[#e2e8f0] ring-0">
                <Truck className="size-6 text-primary" />
              </div>
              <dt className="mt-4 font-semibold text-slate-900">{m.cta.feature1Title}</dt>
              <dd className="mt-2 leading-7 text-slate-600">{m.cta.feature1Desc}</dd>
            </div>
            <div className="flex flex-col items-start">
              <div className="rounded-md bg-white p-2 border border-[#e2e8f0] ring-0">
                <Utensils className="size-6 text-primary" />
              </div>
              <dt className="mt-4 font-semibold text-slate-900">{m.cta.feature2Title}</dt>
              <dd className="mt-2 leading-7 text-slate-600">{m.cta.feature2Desc}</dd>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
