import { asc } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ProductCard } from "@/features/products";
import {
  findAllByCategorySlug,
} from "@/features/products/services/products.service";
import { findBySlug as findBySlug } from "@/features/categories/services/categories.service";
import { products } from "@/lib/db/schema";
import { siteConfig } from "@/lib/config/site";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";

type CategoryLandingProps = {
  params: Promise<{ locale: string; categorySlug: string }>;
};

export async function generateMetadata({
  params,
}: CategoryLandingProps): Promise<Metadata> {
  const { categorySlug } = await params;
  const category = await findBySlug(categorySlug);
  if (!category) return {};
  return {
    title: `${category.name} | ${siteConfig.name}`,
    description: category.description ?? undefined,
  };
}

export default async function CategoryLandingPage({
  params,
}: CategoryLandingProps) {
  const { locale, categorySlug } = await params;
  if (!isLocale(locale)) {
    notFound();
  }

  const typedLocale = locale as Locale;
  const m = getMessages(typedLocale);

  const category = await findBySlug(categorySlug);
  if (!category) {
    notFound();
  }

  const productList = await findAllByCategorySlug(categorySlug, {
    orderBy: asc(products.name),
  });

  const noProducts = productList.length === 0;

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="mb-8 flex items-center gap-2 text-sm text-slate-500">
          <Link href={`/${typedLocale}`} className="hover:text-primary">
            Home
          </Link>
          <span>/</span>
          <Link
            href={`/${typedLocale}/catalog`}
            className="hover:text-primary"
          >
            {m.catalog.title}
          </Link>
          <span>/</span>
          <span className="text-slate-900">{category.name}</span>
        </nav>

        {/* Page header */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            {category.name}
          </h1>
        </div>

        {/* Product grid or empty state */}
        {noProducts ? (
          <p className="py-16 text-center text-slate-500">
            {m.catalog.noProductsInCategory}
          </p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {productList.map((product) => {
              const activeVariants = product.variants?.filter((v) => v.isActive) ?? [];
              const hasVariants = activeVariants.length > 0;
              const minVariantPrice = hasVariants
                ? Math.min(...activeVariants.map((v) => parseFloat(v.price)))
                : undefined;

              return (
                <ProductCard
                  key={product.id}
                  product={{
                    id: product.id,
                    name: product.name,
                    slug: product.slug,
                    basePrice: parseFloat(product.basePrice),
                    priceType: product.priceType,
                    photos: product.photos,
                    category: product.category,
                    hasVariants,
                    minVariantPrice,
                  }}
                  locale={typedLocale}
                  labels={{
                    viewDetails: m.catalog.viewDetails,
                    perUnit: m.catalog.product.pricePerUnit,
                    price: m.catalog.product.price,
                    fromPrice: m.catalog.product.fromPrice,
                  }}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
