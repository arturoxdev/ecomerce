"use server";

import { revalidatePath } from "next/cache";

import { findByIdWithVariants } from "@/features/products/services/products.service";
import {
  createManualOrderService,
  type CreateManualOrderInput,
  type FindProductByIdWithVariants,
} from "@/features/orders/services/manual-order.service";
import { getStoreId } from "@/lib/config/tenant";
import { db } from "@/lib/db";
import { requireWriteAccess } from "@/lib/services/auth";
import type { ProblemDetail } from "@/lib/types/problem-detail";

export type CreateManualOrderActionResult =
  | { success: true; orderId: string }
  | ProblemDetail;

export async function createManualOrder(
  input: CreateManualOrderInput,
): Promise<CreateManualOrderActionResult> {
  const user = await requireWriteAccess();

  const service = createManualOrderService({
    db,
    storeId: getStoreId(),
    userId: user.id,
    findProductByIdWithVariants:
      findByIdWithVariants as FindProductByIdWithVariants,
  });

  const result = await service.createManualOrder(input);
  if (!result.success) return result.problem;

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${result.orderId}`);
  revalidatePath("/admin/schedule");
  return { success: true, orderId: result.orderId };
}
