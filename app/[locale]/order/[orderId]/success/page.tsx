import { notFound } from "next/navigation";

import { PaymentBreakdown } from "@/features/checkout";
import * as orderRepo from "@/features/admin-orders";
import { getSettings } from "@/features/admin-settings";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { headers } from "next/headers";

import { SuccessClient } from "./success-client";

type Props = {
  params: Promise<{ locale: string; orderId: string }>;
  searchParams: Promise<{ session_id?: string }>;
};

export default async function SuccessPage({ params, searchParams }: Props) {
  const { locale, orderId } = await params;
  const { session_id } = await searchParams;

  const hdrs = await headers();
  const rate = await checkRateLimit(
    `success:ip:${getClientIp(hdrs)}`,
    30,
    60,
  );
  if (!rate.allowed) notFound();

  const order = await orderRepo.findByIdWithItems(orderId);
  if (!order) notFound();

  // D.4 — if caller sends a session_id hint, it must match. Always 404, never redirect.
  if (session_id && order.stripeSessionId !== session_id) notFound();

  const settings = await getSettings();
  const paymentMode = settings?.paymentMode ?? "SPLIT_50_50";

  if (order.paymentStatus !== "CAPTURED") {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="mb-2 text-xl font-semibold text-slate-900">
          Processing payment…
        </h1>
        <p className="text-sm text-slate-500">
          We are confirming your payment with Stripe. This page will refresh
          automatically.
        </p>
        <SuccessClient orderId={orderId} locale={locale} poll />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <SuccessClient orderId={orderId} locale={locale} />
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Payment received</h1>
        <p className="mt-1 text-sm text-slate-500">
          Order #{order.id.slice(0, 8).toUpperCase()}
        </p>
      </div>

      <div className="mb-6 rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="mb-3 text-base font-semibold">Payment</h2>
        <PaymentBreakdown
          total={order.total}
          amountPaid={order.amountPaid}
          paymentMode={paymentMode}
        />
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="mb-3 text-base font-semibold">Items</h2>
        <ul className="space-y-2 text-sm">
          {order.orderItems.map((item) => (
            <li key={item.id} className="flex justify-between">
              <span>
                {item.product.name} × {item.quantity}
              </span>
              <span>${parseFloat(item.subtotal).toFixed(2)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
