import Link from "next/link";

import { CategoryTable } from "@/features/admin-categories";
import { findAllWithProductCount } from "@/features/catalog";
import { canWriteData } from "@/features/auth";
import { getSessionUser } from "@/features/auth";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/admin/site-header";

export default async function AdminCategoriesPage() {
  const user = await getSessionUser();
  const canWrite = canWriteData(user.role);
  const categoriesWithProducts = await findAllWithProductCount();

  const categories = categoriesWithProducts.map((c) => ({
    ...c,
    _count: { products: c.products.length },
  }));

  return (
    <>
      <SiteHeader
        title="Categories"
        actions={
          canWrite && (
            <Button size="sm" render={<Link href="/admin/categories/new" />}>
              Add category
            </Button>
          )
        }
      />
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="px-4 lg:px-6">
          <CategoryTable categories={categories} canWrite={canWrite} />
        </div>
      </div>
    </>
  );
}
