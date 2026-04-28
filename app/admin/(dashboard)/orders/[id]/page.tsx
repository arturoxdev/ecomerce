import { ArrowLeft, CalendarDays } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { SiteHeader } from "@/components/admin/site-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getOrderDetail } from "@/features/orders/actions";

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
  const order = await getOrderDetail(id);
  if (!order) notFound();

  const shortId = order.id.slice(0, 8).toUpperCase();

  return (
    <>
      <SiteHeader title={`Order #${shortId}`} />
      <div className="flex flex-1 flex-col gap-6 p-4">
        <Link
          href="/admin/orders"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to Orders
        </Link>

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          {/* Items */}
          <Card>
            <CardHeader>
              <CardTitle>Items</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Rental Period</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
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
                          {format(new Date(item.rentDate), "MMM d, yyyy")}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">
                        ${parseFloat(item.unitPrice).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ${parseFloat(item.subtotal).toFixed(2)}
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
                <CardTitle>Customer</CardTitle>
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
              </CardContent>
            </Card>

            {/* Order totals */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Summary</CardTitle>
                  <Badge
                    variant="secondary"
                    className={statusColors[order.status] ?? ""}
                  >
                    {order.status}
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
                        <span>${parseFloat(order.subtotal).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Delivery</span>
                        <span>
                          {parseFloat(order.deliveryFee) === 0
                            ? "Included"
                            : `$${parseFloat(order.deliveryFee).toFixed(2)}`}
                        </span>
                      </div>
                      <Separator />
                      <div className="flex justify-between text-base font-bold">
                        <span>Total</span>
                        <span>${totalNum.toFixed(2)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Paid online
                          {isSplit ? " (50%)" : paidNum >= totalNum && totalNum > 0 ? " (100%)" : ""}
                        </span>
                        <span className="font-medium text-primary">
                          ${paidNum.toFixed(2)}
                        </span>
                      </div>
                      {balanceNum > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            Balance on delivery
                            {isSplit ? " (50%)" : ""}
                          </span>
                          <span className="font-medium">
                            ${balanceNum.toFixed(2)}
                          </span>
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground pt-2">
                        Created: {format(new Date(order.createdAt), "MMM d, yyyy HH:mm")}
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
