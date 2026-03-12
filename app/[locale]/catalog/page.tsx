import { notFound } from "next/navigation";

import { CategoryFilter } from "@/components/catalog/category-filter";
import { ProductCard } from "@/components/catalog/product-card";
import { db } from "@/lib/db";
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

  const categoryFilter =
    categorySlug && categorySlug !== "all"
      ? { category: { slug: categorySlug } }
      : {};

  const [categories, products] = await Promise.all([
    db.category.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true },
    }),
    db.product.findMany({
      where: {
        isActive: true,
        ...categoryFilter,
      },
      include: {
        category: { select: { name: true, slug: true } },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  const noProducts = products.length === 0;
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
            categories={categories}
            currentSlug={categorySlug ?? null}
            allLabel={m.catalog.filterAll}
          />
        </div>

        {/* Product grid or empty state */}
        {noProducts ? (
          <p className="py-16 text-center text-slate-500">{emptyMessage}</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={{
                  id: product.id,
                  name: product.name,
                  slug: product.slug,
                  basePrice: product.basePrice.toNumber(),
                  priceType: product.priceType,
                  photos: product.photos,
                  category: product.category,
                }}
                locale={typedLocale}
                labels={{
                  viewDetails: m.catalog.viewDetails,
                  perUnit: m.catalog.product.pricePerUnit,
                  price: m.catalog.product.price,
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
