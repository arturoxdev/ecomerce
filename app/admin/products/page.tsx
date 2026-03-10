import Link from "next/link";

import { db } from "@/lib/db";

import { ProductTable } from "./product-table";

const PAGE_SIZE = 20;

type Props = {
  searchParams: Promise<{ page?: string }>;
};

export default async function AdminProductsPage({ searchParams }: Props) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10));
  const skip = (page - 1) * PAGE_SIZE;

  const [products, total] = await Promise.all([
    db.product.findMany({
      skip,
      take: PAGE_SIZE,
      include: { category: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    db.product.count(),
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

      <ProductTable products={products} page={page} totalPages={totalPages} />
    </div>
  );
}
