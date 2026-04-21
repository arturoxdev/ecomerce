import { notFound } from "next/navigation";

import { CartPageClient } from "@/features/cart";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function CartPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const m = getMessages(locale as Locale);

  return (
    <CartPageClient
      locale={locale}
      labels={{
        ...m.cart,
        splitBadge: m.payment.splitBadge,
        splitNotice: m.payment.splitNotice,
        payNow: m.payment.payNow,
        balanceOnDelivery: m.payment.balanceOnDelivery,
      }}
    />
  );
}
