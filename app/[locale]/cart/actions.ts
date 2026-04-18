"use server";

import { findByIdWithVariants } from "@/features/products/services/products.service";
import {
  getStoreSettings,
  placeOrder as placeOrderBase,
  type PlaceOrderInput,
  type PlaceOrderResult,
} from "@/features/cart/services/cart-order.service";

export { getStoreSettings, type PlaceOrderInput, type PlaceOrderResult };

export async function placeOrder(
  input: PlaceOrderInput,
): Promise<PlaceOrderResult> {
  return placeOrderBase(input, {
    findProductByIdWithVariants: findByIdWithVariants,
  });
}
