import "server-only";

import { z } from "zod";

import { findZipcodeByCityAndCode } from "@/features/zipcodes/services/zipcodes.service";
import { getStoreId } from "@/lib/config/tenant";
import * as settingRepo from "@/lib/data/settings";
import { getMinBookableDate, parseDateOnly } from "@/lib/date";
import { db, type Database } from "@/lib/db";
import { availability, orderItems, orders } from "@/lib/db/schema";
import { checkAvailability } from "@/lib/services/availability.service";

import {
  calculateCartSummary,
  type CartStoreSettings,
} from "./cart-pricing.service";

const ZIPCODE_REGEX = /^[A-Za-z0-9]{1,8}$/;

type ProductLookupResult =
  | {
      id: string;
      name: string;
      basePrice: string;
      stock: number | null;
      isActive: boolean;
      variants?: Array<{
        id: string;
        price: string;
        stock: number;
      }>;
    }
  | null
  | undefined;

export type FindProductByIdWithVariants = (
  productId: string,
) => PromiseLike<ProductLookupResult>;

export type RateLimitCheck = (
  key: string,
  max: number,
  windowSeconds: number,
) => Promise<{ allowed: boolean }>;

// Structural shape of the delivery-pricing quote. Defined locally (not imported
// from `@/features/delivery-pricing`) because features must not import each
// other — the real `quoteDelivery` is injected from the app/action layer.
export type DeliveryQuoteOutcome =
  | { ok: true; miles: number; fee: number }
  | { ok: false; error: "OUT_OF_CAP"; miles: number; capMiles: number }
  | { ok: false; error: "UNAVAILABLE" };

export type QuoteDeliveryFn = (input: {
  storeId: string;
  destLat: number;
  destLng: number;
}) => Promise<DeliveryQuoteOutcome>;

export type CartOrderServiceDeps = {
  db: Database;
  storeId: string;
  findProductByIdWithVariants: FindProductByIdWithVariants;
  loadStoreSettings?: () => Promise<CartStoreSettings>;
  checkRateLimit?: RateLimitCheck;
  quoteDelivery?: QuoteDeliveryFn;
};

const placeOrderItemSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().nullable(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const placeOrderSchema = z.object({
  customerName: z.string().min(1, "Name is required"),
  customerEmail: z.string().email("Valid email is required"),
  customerPhone: z.string().min(1, "Phone is required"),
  deliveryAddress: z.string().optional().default(""),
  selectedCity: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .optional()
    .nullable(),
  selectedZipCode: z
    .string()
    .regex(ZIPCODE_REGEX, "Invalid zipcode")
    .optional()
    .nullable(),
  // DISTANCE_MILES: the form submits only the picked place. The server NEVER
  // trusts a client-sent fee or miles — it re-derives both from these coords.
  destLat: z.coerce.number().gte(-90).lte(90).optional().nullable(),
  destLng: z.coerce.number().gte(-180).lte(180).optional().nullable(),
  formattedAddress: z.string().max(500).optional().nullable(),
  locale: z.enum(["en", "es"]).optional().default("en"),
  items: z.array(placeOrderItemSchema).min(1, "Cart cannot be empty"),
});

export type PlaceOrderInput = z.input<typeof placeOrderSchema>;
export type PlaceOrderResult =
  | { success: true; orderId: string; locale: "en" | "es" }
  | { success: false; error: string; unavailableItems?: string[] };

// ---------------------------------------------------------------------------
// Store settings loader — exposed as a free function so both the default
// instance and consumers that want the current settings (cart page) can use
// it without knowing about the service factory.
// ---------------------------------------------------------------------------

export async function getStoreSettings(): Promise<CartStoreSettings> {
  const settings = await settingRepo.getAll();

  return {
    deliveryMode: settings?.deliveryMode ?? "INCLUDED",
    deliveryFee: settings?.deliveryFee ? parseFloat(settings.deliveryFee) : 0,
    depositPercent: settings?.depositPercent
      ? parseFloat(settings.depositPercent)
      : 0.1,
    paymentMode: settings?.paymentMode ?? "SPLIT_50_50",
    currency: settings?.currency ?? "USD",
  };
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createCartOrderService(deps: CartOrderServiceDeps) {
  const loadStoreSettings = deps.loadStoreSettings ?? getStoreSettings;

  async function placeOrder(
    input: PlaceOrderInput,
  ): Promise<PlaceOrderResult> {
    const parsed = placeOrderSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues.map((issue) => issue.message).join(", "),
      };
    }

    const data = parsed.data;

    if (deps.checkRateLimit) {
      const emailLimit = await deps.checkRateLimit(
        `placeOrder:email:${data.customerEmail.toLowerCase()}`,
        3,
        60 * 60,
      );
      if (!emailLimit.allowed) {
        return { success: false, error: "Too many requests. Try again later." };
      }
    }

    const storeSettings = await loadStoreSettings();

    let resolvedZipFee: number | null = null;
    let resolvedZipCode: string | null = null;
    let resolvedCity: string | null = null;
    let resolvedDistanceFee: number | null = null;
    let resolvedDistanceMiles: number | null = null;
    let resolvedDestLat: number | null = null;
    let resolvedDestLng: number | null = null;
    let resolvedDistanceAddress: string | null = null;
    if (storeSettings.deliveryMode === "ZIP_CODE") {
      if (!data.selectedCity || !data.selectedZipCode) {
        return {
          success: false,
          error: "Selecciona ciudad y zipcode antes de continuar",
        };
      }
      const zipRow = await findZipcodeByCityAndCode(
        data.selectedCity,
        data.selectedZipCode,
      );
      if (!zipRow) {
        return {
          success: false,
          error: "Aún no hacemos entregas a ese destino",
        };
      }
      resolvedZipFee = parseFloat(zipRow.fee);
      resolvedZipCode = zipRow.zipCode;
      resolvedCity = zipRow.city;
    } else if (storeSettings.deliveryMode === "DISTANCE_MILES") {
      if (!deps.quoteDelivery) {
        return {
          success: false,
          error: "Por ahora no podemos completar la reserva, comunícate con nosotros",
        };
      }
      if (
        data.destLat === null ||
        data.destLat === undefined ||
        data.destLng === null ||
        data.destLng === undefined
      ) {
        return {
          success: false,
          error: "Selecciona tu dirección de entrega antes de continuar",
        };
      }
      // Re-derive miles + fee server-side from the destination coordinates and
      // the CURRENT tier table; never trust the cart's number.
      const quote = await deps.quoteDelivery({
        storeId: deps.storeId,
        destLat: data.destLat,
        destLng: data.destLng,
      });
      if (!quote.ok) {
        if (quote.error === "OUT_OF_CAP") {
          return {
            success: false,
            error: `Tu dirección está fuera de la zona de entrega (${quote.miles.toFixed(
              1,
            )} mi · máximo ${quote.capMiles} mi)`,
          };
        }
        return {
          success: false,
          error: "Por ahora no podemos completar la reserva, comunícate con nosotros",
        };
      }
      resolvedDistanceFee = quote.fee;
      resolvedDistanceMiles = quote.miles;
      resolvedDestLat = data.destLat;
      resolvedDestLng = data.destLng;
      resolvedDistanceAddress = data.formattedAddress ?? null;
    }

    const minBookable = getMinBookableDate();

    return deps.db
      .transaction(async (tx) => {
        const unavailableItems: string[] = [];
        const validatedItems: Array<{
          productId: string;
          variantId: string | null;
          quantity: number;
          unitPrice: number;
          date: Date;
          productName: string;
        }> = [];

        for (const item of data.items) {
          const product = await deps.findProductByIdWithVariants(
            item.productId,
          );
          if (!product || !product.isActive) {
            unavailableItems.push(item.productId);
            continue;
          }

          const variant = item.variantId
            ? product.variants?.find(
                (candidate) => candidate.id === item.variantId,
              )
            : null;

          const expectedPrice = variant
            ? parseFloat(variant.price)
            : parseFloat(product.basePrice);
          if (Math.abs(expectedPrice - item.unitPrice) > 0.01) {
            unavailableItems.push(product.name);
            continue;
          }

          const stock = variant ? variant.stock : product.stock ?? 1;
          const date = parseDateOnly(item.date);

          if (date < minBookable) {
            unavailableItems.push(product.name);
            continue;
          }

          const availabilityCheck = await checkAvailability(tx, {
            productId: item.productId,
            variantId: item.variantId,
            date,
            quantity: item.quantity,
            stock,
          });
          if (!availabilityCheck.isAvailable) {
            unavailableItems.push(product.name);
            continue;
          }

          validatedItems.push({
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            date,
            productName: product.name,
          });
        }

        if (unavailableItems.length > 0) {
          throw new Error(`UNAVAILABLE:${unavailableItems.join(",")}`);
        }

        const subtotal = validatedItems.reduce(
          (sum, item) => sum + item.unitPrice * item.quantity,
          0,
        );
        const summary = calculateCartSummary({
          subtotal,
          settings: storeSettings,
          resolvedZipFee,
          resolvedDistanceFee,
        });

        const [order] = await tx
          .insert(orders)
          .values({
            storeId: deps.storeId,
            customerName: data.customerName,
            customerEmail: data.customerEmail,
            customerPhone: data.customerPhone,
            deliveryAddress:
              resolvedDistanceAddress ?? (data.deliveryAddress || null),
            city: resolvedCity,
            zipCode: resolvedZipCode,
            deliveryMiles:
              resolvedDistanceMiles !== null
                ? resolvedDistanceMiles.toFixed(2)
                : null,
            deliveryDestinationLat:
              resolvedDestLat !== null ? resolvedDestLat.toFixed(7) : null,
            deliveryDestinationLng:
              resolvedDestLng !== null ? resolvedDestLng.toFixed(7) : null,
            subtotal: subtotal.toFixed(2),
            depositAmount: summary.deposit.toFixed(2),
            deliveryFee: summary.deliveryFee.toFixed(2),
            total: summary.total.toFixed(2),
            amountPaid: "0",
            paymentStatus: "AUTHORIZED",
            paymentMethod: "CARD",
            status: "PENDING",
            currency: storeSettings.currency,
          })
          .returning();

        for (const item of validatedItems) {
          await tx.insert(orderItems).values({
            orderId: order.id,
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
            unitPrice: item.unitPrice.toFixed(2),
            subtotal: (item.unitPrice * item.quantity).toFixed(2),
            rentDate: item.date,
          });

          await tx.insert(availability).values({
            productId: item.productId,
            variantId: item.variantId,
            date: item.date,
            quantity: item.quantity,
            orderId: order.id,
          });
        }

        return {
          success: true as const,
          orderId: order.id,
          locale: data.locale,
        };
      })
      .catch((error: Error) => {
        if (error.message.startsWith("UNAVAILABLE:")) {
          const items = error.message.replace("UNAVAILABLE:", "").split(",");
          return {
            success: false as const,
            error: "Some items are no longer available",
            unavailableItems: items,
          };
        }

        console.error("placeOrder error:", error);
        return {
          success: false as const,
          error: "An unexpected error occurred",
        };
      });
  }

  return { placeOrder };
}

export type CartOrderService = ReturnType<typeof createCartOrderService>;

// ---------------------------------------------------------------------------
// Back-compat default entrypoint — keeps the existing `placeOrder(input, deps)`
// signature used by `app/[locale]/cart/actions.ts`.
// ---------------------------------------------------------------------------

export async function placeOrder(
  input: PlaceOrderInput,
  dependencies: {
    findProductByIdWithVariants: FindProductByIdWithVariants;
    checkRateLimit?: RateLimitCheck;
    quoteDelivery?: QuoteDeliveryFn;
  },
): Promise<PlaceOrderResult> {
  const service = createCartOrderService({
    db,
    storeId: getStoreId(),
    findProductByIdWithVariants: dependencies.findProductByIdWithVariants,
    checkRateLimit: dependencies.checkRateLimit,
    quoteDelivery: dependencies.quoteDelivery,
  });
  return service.placeOrder(input);
}
