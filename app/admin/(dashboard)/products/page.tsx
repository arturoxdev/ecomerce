import { asc, desc } from "drizzle-orm";
import Link from "next/link";

import { getSessionUser } from "@/lib/auth/session";
import { canWriteData } from "@/lib/auth/permissions";
import { categories, products } from "@/lib/db/schema";
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
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Products</h1>
        {canWrite && (
          <Link
            href="/admin/products/new"
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
          >
            Add product
          </Link>
        )}
      </div>

      <div className="mb-4">
        <ProductFilters categories={categoryList} />
      </div>

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
  );
}
