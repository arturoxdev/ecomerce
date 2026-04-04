import { asc, desc } from "drizzle-orm";
import Link from "next/link";

import { getSessionUser } from "@/lib/auth/session";
import { canWriteData } from "@/lib/auth/permissions";
import { categories, products } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/admin/site-header";
import * as categoryRepo from "@/lib/repositories/category";
import * as productRepo from "@/lib/repositories/product";

import { ProductFilters } from "./product-status-filter";
import { ProductTable } from "./product-table";

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
    productRepo.findAllWithCategory({
      offset: skip,
      limit: PAGE_SIZE,
      where,
      orderBy: desc(products.createdAt),
    }),
    productRepo.count(where),
    categoryRepo.findAll({ orderBy: asc(categories.name) }),
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
