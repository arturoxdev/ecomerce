import { notFound } from "next/navigation";

import { CartPageClient } from "@/features/cart";
import { findServicesByStore } from "@/features/admin-global-services/data";
import { getStoreId } from "@/lib/config/tenant";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function CartPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const m = getMessages(locale as Locale);

  // ADR-009: Global Services are picked at checkout (once per order). The DAL
  // returns all rows incl. inactive; only active ones are offered publicly.
  const globalServices = (await findServicesByStore(getStoreId()))
    .filter((s) => s.isActive)
    .map((s) => ({
      id: s.id,
      name: s.name,
      price: s.price,
      description: s.description,
    }));

  return (
    <CartPageClient
      locale={locale}
      globalServices={globalServices}
      labels={{
        ...m.cart,
        servicesFee: m.cart.servicesFee,
        splitBadge: m.payment.splitBadge,
        splitNotice: m.payment.splitNotice,
        payNow: m.payment.payNow,
        balanceOnDelivery: m.payment.balanceOnDelivery,
        servicesSectionTitle: m.additionalServices.sectionTitle,
        servicesOptionalAddOns: m.additionalServices.optionalAddOns,
        servicesNone: m.additionalServices.noServices,
      }}
    />
  );
}
