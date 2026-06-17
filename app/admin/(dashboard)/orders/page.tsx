import { SiteHeader } from "@/components/admin/site-header";
import { getSettings } from "@/features/admin-settings/data";
import { OrderTable } from "@/features/orders";
import { getOrders } from "@/features/orders/actions";
import { CreateOrderButton } from "@/features/orders/components/admin/create-order-button";
import { getSessionUser } from "@/lib/services/auth";

type Props = {
  searchParams: Promise<{ page?: string }>;
};

export default async function AdminOrdersPage({ searchParams }: Props) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const [{ orders, total, pageSize }, user, storeSettings] = await Promise.all([
    getOrders({ page }),
    getSessionUser(),
    getSettings(),
  ]);

  return (
    <>
      <SiteHeader title="Órdenes" />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="flex items-center justify-end">
          <CreateOrderButton
            currentRole={user.role}
            eventWindowStart={storeSettings?.eventWindowStart ?? null}
            eventWindowEnd={storeSettings?.eventWindowEnd ?? null}
          />
        </div>
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
