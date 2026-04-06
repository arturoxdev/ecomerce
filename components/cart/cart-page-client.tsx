"use client";

import { useEffect, useState, useTransition } from "react";
import { ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useCartStore, getCartSubtotal } from "@/lib/stores/cart-store";
import type { CartItem as CartItemType } from "@/lib/stores/cart-store";
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
  deposit: string;
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

  const [mounted, setMounted] = useState(false);
  const [settings, setSettings] = useState<{
    deliveryMode: string;
    deliveryFee: number;
    depositPercent: number;
  } | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // Customer form state
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setMounted(true);
    getStoreSettings().then(setSettings);
  }, []);

  if (!mounted) {
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
  const deliveryFee =
    settings?.deliveryMode === "INCLUDED" ? 0 : (settings?.deliveryFee ?? 0);
  const depositPercent = settings?.depositPercent ?? 0.1;
  const deposit = subtotal * depositPercent;
  const total = subtotal + deliveryFee;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!customerName.trim()) errors.name = "Required";
    if (!customerEmail.trim() || !customerEmail.includes("@"))
      errors.email = "Valid email required";
    if (!customerPhone.trim()) errors.phone = "Required";
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
      items: items.map((item) => ({
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        startDate: item.startDate,
        endDate: item.endDate,
      })),
    };

    startTransition(async () => {
      const result = await placeOrder(input);
      if (result.success) {
        clearCart();
        router.push(`/${locale}/order/${result.orderId}`);
      } else {
        if (result.unavailableItems) {
          toast.error(
            `${labels.itemUnavailable}: ${result.unavailableItems.join(", ")}`,
          );
        } else {
          toast.error(result.error);
        }
      }
    });
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
                labels={{ remove: labels.remove, quantity: labels.quantity }}
              />
            ))}

            {/* Customer info */}
            <Separator className="my-6" />
            <h2 className="text-lg font-semibold text-slate-900">
              {labels.customerInfo}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="name">{labels.name}</Label>
                <Input
                  id="name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className={formErrors.name ? "border-red-500" : ""}
                />
                {formErrors.name && (
                  <p className="mt-1 text-xs text-red-500">{formErrors.name}</p>
                )}
              </div>
              <div>
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
              <div>
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
              <div>
                <Label htmlFor="address">{labels.address}</Label>
                <Input
                  id="address"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder={labels.addressPlaceholder}
                />
              </div>
            </div>
          </div>

          {/* Summary sidebar */}
          <div className="h-fit rounded-lg border border-slate-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">
              {labels.summary}
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">{labels.subtotal}</span>
                <span className="font-medium">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">{labels.deliveryFee}</span>
                <span className="font-medium">
                  {deliveryFee === 0
                    ? labels.included
                    : `$${deliveryFee.toFixed(2)}`}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">
                  {labels.deposit} ({(depositPercent * 100).toFixed(0)}%)
                </span>
                <span className="font-medium">${deposit.toFixed(2)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-base font-bold">
                <span>{labels.total}</span>
                <span className="text-primary">${total.toFixed(2)}</span>
              </div>
            </div>
            <Button
              type="submit"
              size="lg"
              className="mt-6 w-full"
              disabled={isPending}
            >
              {isPending ? labels.processing : labels.confirmOrder}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
