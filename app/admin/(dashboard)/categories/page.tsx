import Link from "next/link";

import { canWriteData } from "@/lib/auth/permissions";
import { getSessionUser } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/admin/site-header";
import * as categoryRepo from "@/lib/repositories/category";

import { CategoryTable } from "./category-table";

export default async function AdminCategoriesPage() {
  const user = await getSessionUser();
  const canWrite = canWriteData(user.role);
  const categoriesWithProducts = await categoryRepo.findAllWithProductCount();

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
