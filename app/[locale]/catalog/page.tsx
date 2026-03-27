import { asc } from "drizzle-orm";
import { notFound } from "next/navigation";

import { CategoryFilter } from "@/components/catalog/category-filter";
import { ProductCard } from "@/components/catalog/product-card";
import { categories, products } from "@/lib/db/schema";
import * as categoryRepo from "@/lib/repositories/category";
import * as productRepo from "@/lib/repositories/product";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";

type CatalogPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ category?: string }>;
};

export default async function CatalogPage({
  params,
  searchParams,
}: CatalogPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) {
    notFound();
  }

  const typedLocale = locale as Locale;
  const m = getMessages(typedLocale);

  const { category: categorySlug } = await searchParams;

  const categoryList = await categoryRepo.findAll({
    orderBy: asc(categories.sortOrder),
    columns: { id: true, name: true, slug: true },
  });

  const productList =
    categorySlug && categorySlug !== "all"
      ? await productRepo.findAllByCategorySlug(categorySlug, {
          orderBy: asc(products.name),
        })
      : await productRepo.findAllWithCategory({
          where: { isActive: true },
          orderBy: asc(products.name),
        });

  const noProducts = productList.length === 0;
  const emptyMessage = categorySlug
    ? m.catalog.noProductsInCategory
    : m.catalog.noProducts;

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Page header */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            {m.catalog.title}
          </h1>
        </div>

        {/* Category filter (client island) */}
        <div className="mb-8">
          <CategoryFilter
            categories={categoryList}
            currentSlug={categorySlug ?? null}
            allLabel={m.catalog.filterAll}
          />
        </div>

        {/* Product grid or empty state */}
        {noProducts ? (
          <p className="py-16 text-center text-slate-500">{emptyMessage}</p>
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
