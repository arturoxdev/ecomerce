import { notFound } from "next/navigation";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getProductBlocks, AvailabilityBlockTable, ManualBlockForm } from "@/features/products";
import { findProductById } from "@/features/products/services/products.service";
import { SiteHeader } from "@/components/admin/site-header";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ProductAvailabilityPage({ params }: Props) {
  const { id } = await params;

  const product = await findProductById(id);
  if (!product) notFound();

  const blocks = await getProductBlocks(id);

  return (
    <>
      <SiteHeader title={`Availability — ${product.name}`} />
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="px-4 lg:px-6">
          <Card>
            <CardHeader>
              <CardTitle>Create manual block</CardTitle>
            </CardHeader>
            <CardContent>
              <ManualBlockForm productId={id} />
            </CardContent>
          </Card>
        </div>

        <div className="px-4 lg:px-6">
          <Card>
            <CardHeader>
              <CardTitle>Blocks & reservations</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <AvailabilityBlockTable blocks={blocks} />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
