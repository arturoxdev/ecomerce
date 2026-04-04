import { notFound } from "next/navigation";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SiteHeader } from "@/components/admin/site-header";
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
