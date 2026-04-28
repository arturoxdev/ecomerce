"use client";

import { useEffect, useState } from "react";
import { ShoppingBag } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { ZipcodeCombobox } from "@/features/zipcodes/components/public/zipcode-combobox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  getCartSubtotal,
  isCartItemPastDue,
  useCartStore,
} from "@/lib/stores/cart-store";
import { calculateCartSummary } from "../services/cart-pricing.service";
import { CartItem } from "./cart-item";
import {
  getStoreSettings,
  placeOrder,
  type PlaceOrderInput,
} from "@/app/[locale]/cart/actions";

type Labels = {
  title: string;
  empty: string;
  emptyDescription: string;
  browseCatalog: string;
  quantity: string;
  remove: string;
  summary: string;
  subtotal: string;
  deliveryFee: string;
  total: string;
  included: string;
  customerInfo: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  addressPlaceholder: string;
  confirmOrder: string;
  processing: string;
  itemUnavailable: string;
  splitBadge: string;
  splitNotice: string;
  payNow: string;
  balanceOnDelivery: string;
  pastDateBadge: string;
  pastDateBlocking: string;
  zipcodeLabel?: string;
  zipcodePlaceholder?: string;
  zipcodeSearchPlaceholder?: string;
  zipcodeEmpty?: string;
  zipcodeLoading?: string;
  zipcodeRequired?: string;
  zipcodeStale?: string;
};

type Props = {
  locale: string;
  labels: Labels;
};

export function CartPageClient({ locale, labels }: Props) {
  const items = useCartStore((s) => s.items);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const clearCart = useCartStore((s) => s.clearCart);
  const selectedZone = useCartStore((s) => s.selectedZone);
  const setSelectedZone = useCartStore((s) => s.setSelectedZone);

  const [hydrated, setHydrated] = useState(
    () => useCartStore.persist?.hasHydrated?.() ?? false,
  );
  const [settings, setSettings] = useState<{
    deliveryMode: string;
    deliveryFee: number;
    depositPercent: number;
    paymentMode: "SPLIT_50_50" | "FULL_ONLINE";
    currency: string;
  } | null>(null);
  const [resolvedZipFee, setResolvedZipFee] = useState<number | null>(null);
  const [zipcodeStale, setZipcodeStale] = useState(false);
  const [isPending, setIsPending] = useState(false);

  // Customer form state
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const unsubscribe = useCartStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });

    getStoreSettings().then(setSettings);

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!settings || settings.deliveryMode !== "ZIP_CODE" || !selectedZone) {
      setResolvedZipFee(null);
      setZipcodeStale(false);
      return;
    }
    const controller = new AbortController();
    fetch(
      `/api/zipcodes/search?q=${encodeURIComponent(selectedZone.zipCode)}&limit=20`,
      { signal: controller.signal },
    )
      .then((res) => res.json())
      .then(
        (data: {
          items: Array<{ city: string; zipcode: string; fee: number }>;
        }) => {
          const match = data.items?.find(
            (row) =>
              row.zipcode === selectedZone.zipCode &&
              row.city.toLowerCase() === selectedZone.city.toLowerCase(),
          );
          if (match) {
            setResolvedZipFee(match.fee);
            setZipcodeStale(false);
          } else {
            setResolvedZipFee(null);
            setZipcodeStale(true);
            setSelectedZone(null);
          }
        },
      )
      .catch(() => {
        // network error: keep current state, don't clobber selection
      });
    return () => controller.abort();
  }, [settings, selectedZone, setSelectedZone]);

  if (!hydrated) {
    return null;
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24">
        <div className="rounded-full bg-slate-100 p-4">
          <ShoppingBag className="size-8 text-slate-400" />
        </div>
        <h2 className="text-lg font-semibold text-slate-900">{labels.empty}</h2>
        <p className="text-sm text-slate-500">{labels.emptyDescription}</p>
        <Link href={`/${locale}/catalog`}>
          <Button>{labels.browseCatalog}</Button>
        </Link>
      </div>
    );
  }

  const subtotal = getCartSubtotal(items);
  const hasPastItems = items.some((item) => isCartItemPastDue(item));
  const resolvedSettings = settings ?? {
    deliveryMode: "INCLUDED",
    deliveryFee: 0,
    depositPercent: 0.1,
    paymentMode: "SPLIT_50_50" as const,
    currency: "USD",
  };
  const summary = calculateCartSummary({
    subtotal,
    settings: resolvedSettings,
    resolvedZipFee,
  });

  const isZipMode = resolvedSettings.deliveryMode === "ZIP_CODE";
  const zipNotSelected = isZipMode && !selectedZone;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!customerName.trim()) errors.name = "Required";
    if (!customerEmail.trim() || !customerEmail.includes("@"))
      errors.email = "Valid email required";
    if (!customerPhone.trim()) errors.phone = "Required";
    if (isZipMode && !selectedZone) {
      errors.zipcode =
        labels.zipcodeRequired ?? "Selecciona un zipcode antes de continuar";
    }
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});

    const input: PlaceOrderInput = {
      customerName: customerName.trim(),
      customerEmail: customerEmail.trim(),
      customerPhone: customerPhone.trim(),
      deliveryAddress: deliveryAddress.trim(),
      selectedCity: isZipMode && selectedZone ? selectedZone.city : null,
      selectedZipCode: isZipMode && selectedZone ? selectedZone.zipCode : null,
      locale: locale === "es" ? "es" : "en",
      items: items.map((item) => ({
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        date: item.date,
      })),
    };

    setIsPending(true);
    (async () => {
      try {
        const result = await placeOrder(input);
        console.log("[checkout] placeOrder result:", result);
        if (result.success) {
          if (!result.checkoutUrl) {
            console.error("[checkout] missing checkoutUrl", result);
            toast.error("No checkout URL returned");
            setIsPending(false);
            return;
          }
          clearCart();
          window.location.assign(result.checkoutUrl);
          return;
        }
        if (result.unavailableItems) {
          toast.error(
            `${labels.itemUnavailable}: ${result.unavailableItems.join(", ")}`,
          );
        } else {
          toast.error(result.error);
        }
      } catch (err) {
        console.error("[checkout] placeOrder threw:", err);
        toast.error("Unexpected error");
      } finally {
        setIsPending(false);
      }
    })();
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="mb-8 text-2xl font-bold text-slate-900">{labels.title}</h1>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
          {/* Items list */}
          <div className="space-y-4">
            {items.map((item) => (
              <CartItem
                key={item.id}
                item={item}
                onRemove={removeItem}
                onQuantityChange={updateQuantity}
                labels={{
                  remove: labels.remove,
                  quantity: labels.quantity,
                  pastDateBadge: labels.pastDateBadge,
                }}
              />
            ))}

            {hasPastItems && (
              <p
                className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                data-testid="cart-past-date-notice"
              >
                {labels.pastDateBlocking}
              </p>
            )}

            {/* Customer info */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-slate-900">
                  {labels.customerInfo}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="name">{labels.name}</Label>
                    <Input
                      id="name"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className={formErrors.name ? "border-red-500" : ""}
                    />
                    {formErrors.name && (
                      <p className="mt-1 text-xs text-red-500">
                        {formErrors.name}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email">{labels.email}</Label>
                    <Input
                      id="email"
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      className={formErrors.email ? "border-red-500" : ""}
                    />
                    {formErrors.email && (
                      <p className="mt-1 text-xs text-red-500">
                        {formErrors.email}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="phone">{labels.phone}</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className={formErrors.phone ? "border-red-500" : ""}
                    />
                    {formErrors.phone && (
                      <p className="mt-1 text-xs text-red-500">
                        {formErrors.phone}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="address">{labels.address}</Label>
                    <Input
                      id="address"
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder={labels.addressPlaceholder}
                    />
                  </div>
                  {isZipMode && (
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label>
                        {labels.zipcodeLabel ?? "Ciudad y código postal"}
                      </Label>
                      <ZipcodeCombobox
                        value={selectedZone}
                        onChange={(zone, fee) => {
                          setSelectedZone(zone);
                          setResolvedZipFee(fee);
                          setZipcodeStale(false);
                        }}
                        labels={{
                          placeholder:
                            labels.zipcodePlaceholder ??
                            "Selecciona ciudad y zipcode",
                          searchPlaceholder:
                            labels.zipcodeSearchPlaceholder ??
                            "Buscar ciudad o zipcode…",
                          empty:
                            labels.zipcodeEmpty ??
                            "Aún no hacemos entregas a ese destino",
                          loading: labels.zipcodeLoading ?? "Buscando…",
                        }}
                      />
                      {zipcodeStale && (
                        <p className="text-xs text-amber-600">
                          {labels.zipcodeStale ??
                            "Tu selección anterior ya no está disponible, escoge otra"}
                        </p>
                      )}
                      {formErrors.zipcode && (
                        <p className="text-xs text-red-500">
                          {formErrors.zipcode}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Summary sidebar */}
          <div className="h-fit rounded-lg border border-slate-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">
              {labels.summary}
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">{labels.subtotal}</span>
                <span
                  className="font-medium"
                  data-testid="cart-summary-subtotal"
                >
                  ${subtotal.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">
                  {labels.deliveryFee}
                  {isZipMode && selectedZone && (
                    <span className="ml-1 text-xs text-muted-foreground">
                      ({selectedZone.city} {selectedZone.zipCode})
                    </span>
                  )}
                </span>
                <span
                  className="font-medium"
                  data-testid="cart-summary-delivery"
                >
                  {summary.deliveryFee === 0
                    ? labels.included
                    : `$${summary.deliveryFee.toFixed(2)}`}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between text-base font-bold">
                <span>{labels.total}</span>
                <span
                  className="text-primary"
                  data-testid="cart-summary-total"
                >
                  ${summary.total.toFixed(2)}
                </span>
              </div>
              {resolvedSettings.paymentMode === "SPLIT_50_50" && (
                <>
                  <Separator />
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">{labels.payNow}</span>
                    <span
                      className="font-medium text-primary"
                      data-testid="cart-summary-pay-now"
                    >
                      ${(summary.total * 0.5).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">
                      {labels.balanceOnDelivery}
                    </span>
                    <span
                      className="font-medium"
                      data-testid="cart-summary-balance-delivery"
                    >
                      ${(summary.total * 0.5).toFixed(2)}
                    </span>
                  </div>
                </>
              )}
            </div>
            {resolvedSettings.paymentMode === "SPLIT_50_50" && (
              <div
                className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-3"
                data-testid="cart-summary-split-notice"
              >
                <Badge variant="secondary" className="mb-2">
                  {labels.splitBadge}
                </Badge>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {labels.splitNotice}
                </p>
              </div>
            )}
            <Button
              type="submit"
              size="lg"
              className="mt-6 w-full"
              disabled={isPending || hasPastItems || zipNotSelected}
            >
              {isPending ? labels.processing : labels.confirmOrder}
            </Button>
            {zipNotSelected && (
              <p className="mt-2 text-xs text-muted-foreground">
                {labels.zipcodeRequired ??
                  "Selecciona un zipcode antes de continuar"}
              </p>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
