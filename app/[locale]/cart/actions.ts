"use server";

import { headers } from "next/headers";

import {
  getStoreSettings,
  placeOrder as placeOrderBase,
  type PlaceOrderInput,
  type PlaceOrderResult as BaseResult,
} from "@/features/cart/services/cart-order.service";
import { createCheckoutSession } from "@/features/checkout";
import { quoteDelivery } from "@/features/delivery-pricing/services/quote.service";
import { findByIdWithVariants } from "@/features/products/services/products.service";
import { logger } from "@/lib/logger";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export { getStoreSettings, type PlaceOrderInput };

export type PlaceOrderResult =
  | { success: true; orderId: string; checkoutUrl: string }
  | { success: false; error: string; unavailableItems?: string[] };

export async function placeOrder(
  input: PlaceOrderInput,
): Promise<PlaceOrderResult> {
  const hdrs = await headers();
  const ip = getClientIp(hdrs);

  const ipLimit = await checkRateLimit(`placeOrder:ip:${ip}`, 5, 10 * 60);
  if (!ipLimit.allowed) {
    return { success: false, error: "Too many requests. Try again later." };
  }

  const result: BaseResult = await placeOrderBase(input, {
    findProductByIdWithVariants: findByIdWithVariants,
    checkRateLimit,
    quoteDelivery,
  });

  if (!result.success) {
    return {
      success: false,
      error: result.error,
      unavailableItems: result.unavailableItems,
    };
  }

  const checkoutLimit = await checkRateLimit(
    `checkout:order:${result.orderId}`,
    10,
    60 * 60,
  );
  if (!checkoutLimit.allowed) {
    return {
      success: false,
      error: "Checkout retry limit reached. Please contact support.",
    };
  }

  const session = await createCheckoutSession(result.orderId, result.locale);
  if (!("success" in session)) {
    logger.error("placeOrder.checkout_session_failed", {
      orderId: result.orderId,
    });
    return {
      success: false,
      error: session.detail ?? "Could not start checkout session",
    };
  }

  return {
    success: true,
    orderId: result.orderId,
    checkoutUrl: session.url,
  };
}
