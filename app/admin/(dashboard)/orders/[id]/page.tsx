import { ArrowLeft, CalendarDays } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { SiteHeader } from "@/components/admin/site-header";
import { ORDER_STATUS_LABEL } from "@/lib/admin/labels";
import {
  formatAdminCurrency,
  formatAdminDate,
  formatAdminDateTime,
} from "@/lib/admin/format";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getOrderDetail } from "@/features/orders/actions";
import { OrderDetailActions } from "@/features/orders/components/admin/order-detail-actions";
import { getSessionUser } from "@/lib/services/auth";

type Props = {
  params: Promise<{ id: string }>;
};

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  CONFIRMED: "bg-green-100 text-green-800",
  DELIVERED: "bg-blue-100 text-blue-800",
  RETURNED: "bg-slate-100 text-slate-800",
  CANCELLED: "bg-red-100 text-red-800",
};

export default async function AdminOrderDetailPage({ params }: Props) {
  const { id } = await params;
  const [order, user] = await Promise.all([
    getOrderDetail(id),
    getSessionUser(),
  ]);
  if (!order) notFound();

  const shortId = order.id.slice(0, 8).toUpperCase();

  return (
    <>
      <SiteHeader title={`Orden #${shortId}`} />
      <div className="flex flex-1 flex-col gap-6 p-4">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/admin/orders"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Volver a Órdenes
          </Link>
          <OrderDetailActions
            orderId={order.id}
            status={order.status}
            paymentStatus={order.paymentStatus}
            paymentMethod={order.paymentMethod}
            isStripe={Boolean(order.stripeSessionId)}
            currentRole={user.role}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          {/* Items */}
          <Card>
            <CardHeader>
              <CardTitle>Artículos</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead>Periodo de renta</TableHead>
                    <TableHead className="text-right">Cantidad</TableHead>
                    <TableHead className="text-right">Precio unitario</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.orderItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div>
                          <Link
                            href={`/admin/products/${item.product.id}/edit`}
                            className="text-sm font-medium hover:underline hover:text-primary"
                          >
                            {item.product.name}
                          </Link>
                          {item.variant?.name && (
                            <p className="text-xs text-muted-foreground">
                              {item.variant.name}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <CalendarDays className="size-3" />
                          {formatAdminDate(item.rentDate)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">
                        {formatAdminCurrency(item.unitPrice)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatAdminCurrency(item.subtotal)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Sidebar: Customer + Totals */}
          <div className="space-y-6">
            {/* Customer info */}
            <Card>
              <CardHeader>
                <CardTitle>Cliente</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="font-medium">{order.customerName}</p>
                <p className="text-muted-foreground">{order.customerEmail}</p>
                <p className="text-muted-foreground">{order.customerPhone}</p>
                {order.deliveryAddress && (
                  <p className="text-muted-foreground">
                    {order.deliveryAddress}
                  </p>
                )}
                {order.deliveryMiles && (
                  <p className="text-xs text-muted-foreground">
                    {parseFloat(order.deliveryMiles).toFixed(1)} mi por carretera
                  </p>
                )}
                {order.deliveryDestinationLat &&
                  order.deliveryDestinationLng && (
                    <p className="text-xs text-muted-foreground">
                      Lat/Lng: {order.deliveryDestinationLat},{" "}
                      {order.deliveryDestinationLng}
                    </p>
                  )}
              </CardContent>
            </Card>

            {/* Order totals */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Resumen</CardTitle>
                  <Badge
                    variant="secondary"
                    className={statusColors[order.status] ?? ""}
                  >
                    {ORDER_STATUS_LABEL[order.status] ?? order.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {(() => {
                  const totalNum = parseFloat(order.total);
                  const paidNum = parseFloat(order.amountPaid);
                  const balanceNum = Math.max(0, totalNum - paidNum);
                  const isSplit = paidNum > 0 && paidNum < totalNum;
                  return (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span>{formatAdminCurrency(order.subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Entrega</span>
                        <span>
                          {parseFloat(order.deliveryFee) === 0
                            ? "Incluida"
                            : formatAdminCurrency(order.deliveryFee)}
                        </span>
                      </div>
                      <Separator />
                      <div className="flex justify-between text-base font-bold">
                        <span>Total</span>
                        <span>{formatAdminCurrency(totalNum)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Pagado en línea
                          {isSplit ? " (50%)" : paidNum >= totalNum && totalNum > 0 ? " (100%)" : ""}
                        </span>
                        <span className="font-medium text-primary">
                          {formatAdminCurrency(paidNum)}
                        </span>
                      </div>
                      {balanceNum > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            Saldo a la entrega
                            {isSplit ? " (50%)" : ""}
                          </span>
                          <span className="font-medium">
                            {formatAdminCurrency(balanceNum)}
                          </span>
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground pt-2">
                        Creada: {formatAdminDateTime(order.createdAt)}
                      </p>
                    </>
                  );
                })()}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
