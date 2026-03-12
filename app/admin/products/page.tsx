import { desc } from "drizzle-orm";
import Link from "next/link";

import { products } from "@/lib/db/schema";
import * as productRepo from "@/lib/repositories/product";

import { ProductStatusFilter } from "./product-status-filter";
import { ProductTable } from "./product-table";

const PAGE_SIZE = 20;

type Props = {
  searchParams: Promise<{ page?: string; status?: string }>;
};

export default async function AdminProductsPage({ searchParams }: Props) {
  const { page: pageParam, status } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10));
  const skip = (page - 1) * PAGE_SIZE;

  const where =
    status === "active"
      ? { isActive: true as const }
      : status === "inactive"
        ? { isActive: false as const }
        : {};

  const [productList, total] = await Promise.all([
    productRepo.findAllWithCategory({
      offset: skip,
      limit: PAGE_SIZE,
      where,
      orderBy: desc(products.createdAt),
    }),
    productRepo.count(where),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Products</h1>
        <Link
          href="/admin/products/new"
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
        >
          Add product
        </Link>
      </div>

      <div className="mb-4">
        <ProductStatusFilter />
      </div>

      <ProductTable
        products={productList}
        page={page}
        totalPages={totalPages}
        status={status}
      />
    </div>
  );
}
