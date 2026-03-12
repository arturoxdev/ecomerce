import Link from "next/link";
import { notFound } from "next/navigation";

import * as productRepo from "@/lib/repositories/product";

import { getProductBlocks } from "../../actions";
import { AvailabilityBlockTable } from "./availability-block-table";
import { ManualBlockForm } from "./manual-block-form";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ProductAvailabilityPage({ params }: Props) {
  const { id } = await params;

  const product = await productRepo.findById(id);
  if (!product) notFound();

  const blocks = await getProductBlocks(id);

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/admin/products"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          &larr; Back to products
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">
          Availability — {product.name}
        </h1>
      </div>

      <div className="mb-8 rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Create manual block
        </h2>
        <ManualBlockForm productId={id} />
      </div>

      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Blocks & reservations
          </h2>
        </div>
        <AvailabilityBlockTable blocks={blocks} />
      </div>
    </div>
  );
}
