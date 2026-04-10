"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { sql } from "drizzle-orm";

import { createCheckoutSession } from "@/features/checkout";
import { findByIdWithVariants } from "@/features/catalog";
import { getStoreId } from "@/lib/config/tenant";
import * as settingRepo from "@/lib/data/settings";
import { db } from "@/lib/db";
import { availability, orderItems, orders } from "@/lib/db/schema";
import { logger } from "@/lib/logger";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function getStoreSettings() {
  const s = await settingRepo.getAll();
  return {
    deliveryMode: s?.deliveryMode ?? "INCLUDED",
    deliveryFee: s?.deliveryFee ? parseFloat(s.deliveryFee) : 0,
    depositPercent: s?.depositPercent ? parseFloat(s.depositPercent) : 0.1,
    paymentMode: s?.paymentMode ?? "SPLIT_50_50",
  };
}

const placeOrderItemSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().nullable(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().positive(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const placeOrderSchema = z.object({
  customerName: z.string().min(1, "Name is required"),
  customerEmail: z.string().email("Valid email is required"),
  customerPhone: z.string().min(1, "Phone is required"),
  deliveryAddress: z.string().optional().default(""),
  locale: z.enum(["en", "es"]).optional().default("en"),
  items: z.array(placeOrderItemSchema).min(1, "Cart cannot be empty"),
});

export type PlaceOrderInput = z.infer<typeof placeOrderSchema>;
export type PlaceOrderResult =
  | { success: true; orderId: string; checkoutUrl: string }
  | { success: false; error: string; unavailableItems?: string[] };

export async function placeOrder(
  input: PlaceOrderInput,
): Promise<PlaceOrderResult> {
  const parsed = placeOrderSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
    };
  }

  const data = parsed.data;
  const hdrs = await headers();
  const ip = getClientIp(hdrs);

  // D.5 — rate limiting (IP + email)
  const ipLimit = await checkRateLimit(`placeOrder:ip:${ip}`, 5, 10 * 60);
  if (!ipLimit.allowed) {
    return { success: false, error: "Too many requests. Try again later." };
  }
  const emailLimit = await checkRateLimit(
    `placeOrder:email:${data.customerEmail.toLowerCase()}`,
    3,
    60 * 60,
  );
  if (!emailLimit.allowed) {
    return { success: false, error: "Too many requests. Try again later." };
  }

  const storeId = getStoreId();
  const storeSettings = await getStoreSettings();

  const txResult = await db
    .transaction(async (tx) => {
      // D.1 — advisory locks per productId (sorted to avoid deadlocks)
      const productIds = [...new Set(data.items.map((i) => i.productId))].sort();
      for (const pid of productIds) {
        await tx.execute(
          sql`SELECT pg_advisory_xact_lock(hashtext(${"av:" + pid}))`,
        );
      }

      const unavailableItems: string[] = [];
      const validatedItems: Array<{
        productId: string;
        variantId: string | null;
        quantity: number;
        unitPrice: number;
        startDate: Date;
        endDate: Date;
        productName: string;
      }> = [];

      for (const item of data.items) {
        const product = await findByIdWithVariants(item.productId);
        if (!product || !product.isActive) {
          unavailableItems.push(item.productId);
          continue;
        }

        const variant = item.variantId
          ? product.variants?.find((v) => v.id === item.variantId)
          : null;

        // D.6 — snapshot unitPrice FROM DB (never trust client)
        const expectedPrice = variant
          ? parseFloat(variant.price)
          : parseFloat(product.basePrice);

        const stock = variant ? variant.stock : (product.stock ?? 1);
        const startDate = new Date(item.startDate + "T00:00:00");
        const endDate = new Date(item.endDate + "T23:59:59");

        const variantId = item.variantId;
        const occupiedResult = variantId
          ? await tx.execute<{ occupied: number }>(sql`
              SELECT COALESCE(SUM(quantity), 0)::int AS occupied
              FROM availability
              WHERE product_id = ${item.productId}::uuid
                AND variant_id = ${variantId}::uuid
                AND start_date < ${endDate}::timestamp
                AND end_date > ${startDate}::timestamp
            `)
          : await tx.execute<{ occupied: number }>(sql`
              SELECT COALESCE(SUM(quantity), 0)::int AS occupied
              FROM availability
              WHERE product_id = ${item.productId}::uuid
                AND variant_id IS NULL
                AND start_date < ${endDate}::timestamp
                AND end_date > ${startDate}::timestamp
            `);

        const occupied = Number(occupiedResult.rows[0]?.occupied ?? 0);
        if (occupied + item.quantity > stock) {
          unavailableItems.push(product.name);
          continue;
        }

        validatedItems.push({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
          unitPrice: expectedPrice,
          startDate,
          endDate,
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
      const deliveryFee =
        storeSettings.deliveryMode === "INCLUDED"
          ? 0
          : storeSettings.deliveryFee;
      const depositAmount = subtotal * storeSettings.depositPercent;
      const total = subtotal + deliveryFee;

      const [order] = await tx
        .insert(orders)
        .values({
          storeId,
          customerName: data.customerName,
          customerEmail: data.customerEmail,
          customerPhone: data.customerPhone,
          deliveryAddress: data.deliveryAddress || null,
          subtotal: subtotal.toFixed(2),
          depositAmount: depositAmount.toFixed(2),
          deliveryFee: deliveryFee.toFixed(2),
          total: total.toFixed(2),
          amountPaid: "0",
          paymentStatus: "AUTHORIZED",
          status: "PENDING",
          currency: "USD",
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
          rentStartDate: item.startDate,
          rentEndDate: item.endDate,
        });

        await tx.insert(availability).values({
          productId: item.productId,
          variantId: item.variantId,
          startDate: item.startDate,
          endDate: item.endDate,
          quantity: item.quantity,
          orderId: order.id,
        });
      }

      return { orderId: order.id as string };
    })
    .catch((err: Error) => {
      if (err.message.startsWith("UNAVAILABLE:")) {
        const items = err.message.replace("UNAVAILABLE:", "").split(",");
        return {
          error: "Some items are no longer available",
          unavailableItems: items,
        } as const;
      }
      logger.error("placeOrder.error", { message: err.message });
      return { error: "An unexpected error occurred" } as const;
    });

  if ("error" in txResult) {
    return {
      success: false,
      error: txResult.error,
      unavailableItems: txResult.unavailableItems,
    };
  }

  const checkoutLimit = await checkRateLimit(
    `checkout:order:${txResult.orderId}`,
    10,
    60 * 60,
  );
  if (!checkoutLimit.allowed) {
    return {
      success: false,
      error: "Checkout retry limit reached. Please contact support.",
    };
  }

  const session = await createCheckoutSession(txResult.orderId, data.locale);
  if (!("success" in session)) {
    logger.error("placeOrder.checkout_session_failed", {
      orderId: txResult.orderId,
    });
    return {
      success: false,
      error: session.detail ?? "Could not start checkout session",
    };
  }

  return {
    success: true,
    orderId: txResult.orderId,
    checkoutUrl: session.url,
  };
}
