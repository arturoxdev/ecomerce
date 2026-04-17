import { CalendarDays, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";
import * as orderRepo from "@/features/admin-orders";

type Props = {
  params: Promise<{ locale: string; orderId: string }>;
};

export default async function OrderConfirmationPage({ params }: Props) {
  const { locale, orderId } = await params;
  if (!isLocale(locale)) notFound();

  const m = getMessages(locale as Locale);
  const order = await orderRepo.findByIdWithItems(orderId);
  if (!order) notFound();

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      {/* Success header */}
      <div className="mb-8 flex flex-col items-center gap-3 text-center">
        <div className="rounded-full bg-green-100 p-3">
          <CheckCircle2 className="size-8 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">
          {m.order.confirmed}
        </h1>
        <p className="text-sm text-slate-500">
          {m.order.confirmedDescription}
        </p>
        <p className="text-xs text-slate-400">
          {m.order.orderNumber}:{" "}
          <span data-testid="order-confirmation-number">
            {order.id.slice(0, 8).toUpperCase()}
          </span>
        </p>
      </div>

      {/* Order items */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">{m.order.items}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {order.orderItems.map((item) => (
            <div key={item.id} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-900">
                  {item.product.name}
                  {item.variant?.name && (
                    <span className="ml-1 text-slate-500">
                      — {item.variant.name}
                    </span>
                  )}
                </p>
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <CalendarDays className="size-3" />
                  <span>
                    {new Date(item.rentStartDate).toLocaleDateString()} →{" "}
                    {new Date(item.rentEndDate).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  {item.quantity} × ${parseFloat(item.unitPrice).toFixed(2)}
                </p>
              </div>
              <p className="text-sm font-semibold">
                ${parseFloat(item.subtotal).toFixed(2)}
              </p>
            </div>
          ))}
          <Separator />
          <div className="space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">{m.cart.subtotal}</span>
              <span>${parseFloat(order.subtotal).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">{m.cart.deliveryFee}</span>
              <span>
                {parseFloat(order.deliveryFee) === 0
                  ? m.cart.included
                  : `$${parseFloat(order.deliveryFee).toFixed(2)}`}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">{m.cart.deposit}</span>
              <span>${parseFloat(order.depositAmount).toFixed(2)}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-base font-bold">
              <span>{m.cart.total}</span>
              <span className="text-primary">
                ${parseFloat(order.total).toFixed(2)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Customer info */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-base">{m.order.customerInfo}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm">
          <p>
            <span className="font-medium">{m.cart.name}:</span>{" "}
            {order.customerName}
          </p>
          <p>
            <span className="font-medium">{m.cart.email}:</span>{" "}
            {order.customerEmail}
          </p>
          <p>
            <span className="font-medium">{m.cart.phone}:</span>{" "}
            {order.customerPhone}
          </p>
          {order.deliveryAddress && (
            <p>
              <span className="font-medium">{m.cart.address}:</span>{" "}
              {order.deliveryAddress}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="text-center">
        <Link href={`/${locale}/catalog`}>
          <Button variant="outline">{m.order.backToCatalog}</Button>
        </Link>
      </div>
    </div>
  );
}
