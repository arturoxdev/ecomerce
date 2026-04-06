"use server";

import { z } from "zod";

import { getStoreId } from "@/lib/config/tenant";
import { db } from "@/lib/db";
import { availability, orderItems, orders } from "@/lib/db/schema";
import { findByIdWithVariants } from "@/features/catalog";
import * as settingRepo from "@/lib/data/settings";
import { sql } from "drizzle-orm";

export async function getStoreSettings() {
  const s = await settingRepo.getAll();
  return {
    deliveryMode: s?.deliveryMode ?? "INCLUDED",
    deliveryFee: s?.deliveryFee ? parseFloat(s.deliveryFee) : 0,
    depositPercent: s?.depositPercent ? parseFloat(s.depositPercent) : 0.1,
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
  items: z.array(placeOrderItemSchema).min(1, "Cart cannot be empty"),
});

export type PlaceOrderInput = z.infer<typeof placeOrderSchema>;
export type PlaceOrderResult =
  | { success: true; orderId: string }
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
  const storeId = getStoreId();
  const storeSettings = await getStoreSettings();

  return db.transaction(async (tx) => {
    const unavailableItems: string[] = [];

    // Validate each item
    const validatedItems: Array<{
      productId: string;
      variantId: string | null;
      quantity: number;
      unitPrice: number;
      startDate: Date;
      endDate: Date;
      productName: string;
      stock: number;
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

      const expectedPrice = variant
        ? parseFloat(variant.price)
        : parseFloat(product.basePrice);
      if (Math.abs(expectedPrice - item.unitPrice) > 0.01) {
        unavailableItems.push(product.name);
        continue;
      }

      const stock = variant ? variant.stock : (product.stock ?? 1);
      const startDate = new Date(item.startDate + "T00:00:00");
      const endDate = new Date(item.endDate + "T23:59:59");

      // Check availability inside transaction
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
        unitPrice: item.unitPrice,
        startDate,
        endDate,
        productName: product.name,
        stock,
      });
    }

    if (unavailableItems.length > 0) {
      throw new Error(`UNAVAILABLE:${unavailableItems.join(",")}`);
    }

    // Calculate totals
    const subtotal = validatedItems.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0,
    );
    const deliveryFee =
      storeSettings.deliveryMode === "INCLUDED" ? 0 : storeSettings.deliveryFee;
    const depositAmount = subtotal * storeSettings.depositPercent;
    const total = subtotal + deliveryFee;

    // Create order
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
        status: "CONFIRMED",
      })
      .returning();

    // Create order items and availability blocks
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

    return { success: true as const, orderId: order.id };
  }).catch((err: Error) => {
    if (err.message.startsWith("UNAVAILABLE:")) {
      const items = err.message.replace("UNAVAILABLE:", "").split(",");
      return {
        success: false as const,
        error: "Some items are no longer available",
        unavailableItems: items,
      };
    }
    console.error("placeOrder error:", err);
    return { success: false as const, error: "An unexpected error occurred" };
  });
}
