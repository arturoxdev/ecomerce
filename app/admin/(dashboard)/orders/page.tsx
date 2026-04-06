import { SiteHeader } from "@/components/admin/site-header";
import { getOrders } from "./actions";
import { OrderTable } from "./order-table";

type Props = {
  searchParams: Promise<{ page?: string }>;
};

export default async function AdminOrdersPage({ searchParams }: Props) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const { orders, total, pageSize } = await getOrders({ page });

  return (
    <>
      <SiteHeader title="Orders" />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <OrderTable
          orders={orders}
          total={total}
          page={page}
          pageSize={pageSize}
        />
      </div>
    </>
  );
}
