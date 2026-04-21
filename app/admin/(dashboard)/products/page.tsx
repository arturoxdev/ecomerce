import { asc, desc } from "drizzle-orm";
import Link from "next/link";

import { ProductFilters, ProductTable } from "@/features/products";
import {
  countProducts,
  findAllWithCategory,
} from "@/features/products/services/products.service";
import { findAll as findAllCategories } from "@/features/categories/services/categories.service";
import { canWriteData, getSessionUser } from "@/lib/services/auth";
import { categories, products } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/admin/site-header";

const PAGE_SIZE = 20;

type Props = {
  searchParams: Promise<{
    page?: string;
    status?: string;
    category?: string;
    search?: string;
  }>;
};

export default async function AdminProductsPage({ searchParams }: Props) {
  const user = await getSessionUser();
  const canWrite = canWriteData(user.role);
  const { page: pageParam, status, category, search } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10));
  const skip = (page - 1) * PAGE_SIZE;

  const where: { isActive?: boolean; categoryId?: string; search?: string } = {};
  if (status === "active") where.isActive = true;
  if (status === "inactive") where.isActive = false;
  if (category && category !== "all") where.categoryId = category;
  if (search) where.search = search;

  const [productList, total, categoryList] = await Promise.all([
    findAllWithCategory({
      offset: skip,
      limit: PAGE_SIZE,
      where,
      orderBy: desc(products.createdAt),
    }),
    countProducts(where),
    findAllCategories({ orderBy: asc(categories.name) }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <>
      <SiteHeader
        title="Products"
        actions={
          canWrite && (
            <Button size="sm" render={<Link href="/admin/products/new" />}>
              Add product
            </Button>
          )
        }
      />
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="px-4 lg:px-6">
          <ProductFilters categories={categoryList} />
        </div>
        <div className="px-4 lg:px-6">
          <ProductTable
            products={productList}
            page={page}
            totalPages={totalPages}
            status={status}
            category={category}
            search={search}
            canWrite={canWrite}
          />
        </div>
      </div>
    </>
  );
}
