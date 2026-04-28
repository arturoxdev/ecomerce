import Link from "next/link";
import { Plus } from "lucide-react";

import { CategoryTable } from "@/features/categories";
import { findAllWithProductCount } from "@/features/categories/services/categories.service";
import { canWriteData, getSessionUser } from "@/lib/services/auth";
import { Button } from "@/components/ui/button";
import { SearchFilter } from "@/components/admin/search-filter";
import { SiteHeader } from "@/components/admin/site-header";

export default async function AdminCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const user = await getSessionUser();
  const canWrite = canWriteData(user.role);
  const { search } = await searchParams;

  const categoriesWithProducts = await findAllWithProductCount();
  const all = categoriesWithProducts.map((c) => ({
    ...c,
    _count: { products: c.products.length },
  }));

  const filtered = search
    ? all.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.slug.toLowerCase().includes(search.toLowerCase()),
      )
    : all;

  return (
    <>
      <SiteHeader
        title="Categorías"
        subtitle={`${all.length} categoría${all.length === 1 ? "" : "s"}`}
        actions={
          canWrite && (
            <Button
              variant="cta"
              className="h-8 gap-1.5 rounded-md px-3.5 text-[13px] font-semibold"
              render={<Link href="/admin/categories/new" />}
            >
              <Plus className="size-3.5" strokeWidth={2.4} />
              Nueva categoría
            </Button>
          )
        }
      />
      <div className="flex flex-col gap-3.5 px-7 pt-5 pb-7">
        <SearchFilter placeholder="Buscar categoría…" width={320} />
        <CategoryTable categories={filtered} canWrite={canWrite} />
      </div>
    </>
  );
}
