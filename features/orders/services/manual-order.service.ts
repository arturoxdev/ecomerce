import "server-only";

import { z } from "zod";

import { recordAudit } from "@/lib/audit";
import * as settingRepo from "@/lib/data/settings";
import { parseDateOnly } from "@/lib/date";
import { type Database } from "@/lib/db";
import { availability, orderItems, orders } from "@/lib/db/schema";
import { validationProblem } from "@/lib/problems";
import { checkAvailability } from "@/lib/services/availability.service";
import type { ProblemDetail } from "@/lib/types/problem-detail";

type ProductLookupResult =
  | {
      id: string;
      name: string;
      basePrice: string;
      stock: number | null;
      isActive: boolean;
      storeId: string;
      variants?: Array<{
        id: string;
        price: string;
        stock: number;
        isActive: boolean;
      }>;
    }
  | null
  | undefined;

export type FindProductByIdWithVariants = (
  productId: string,
) => PromiseLike<ProductLookupResult>;

type RecordAudit = typeof recordAudit;

export type ManualOrderServiceDeps = {
  db: Database;
  storeId: string;
  userId: string;
  findProductByIdWithVariants: FindProductByIdWithVariants;
  clock?: () => Date;
  recordAudit?: RecordAudit;
};

const itemSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().nullable(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().nonnegative(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const createManualOrderSchema = z
  .object({
    customerName: z.string().min(1, "Name is required"),
    customerEmail: z.string().email("Valid email is required"),
    customerPhone: z.string().min(1, "Phone is required"),
    deliveryAddress: z.string().optional().default(""),
    items: z.array(itemSchema).min(1, "At least one item is required"),
    amountPaid: z.number().nonnegative(),
    paymentMethod: z.enum(["CASH", "TRANSFER"]),
  })
  .superRefine((data, ctx) => {
    const total = data.items.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0,
    );
    if (data.amountPaid > total + 0.001) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["amountPaid"],
        message: "amountPaid cannot exceed total",
      });
    }
  });

export type CreateManualOrderInput = z.input<typeof createManualOrderSchema>;
export type CreateManualOrderResult =
  | { success: true; orderId: string }
  | { success: false; problem: ProblemDetail; unavailableItems?: string[] };

function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

export function createManualOrderService(deps: ManualOrderServiceDeps) {
  const clock = deps.clock ?? (() => new Date());
  const audit = deps.recordAudit ?? recordAudit;

  async function createManualOrder(
    input: CreateManualOrderInput,
  ): Promise<CreateManualOrderResult> {
    const parsed = createManualOrderSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, problem: validationProblem(parsed.error) };
    }

    const data = parsed.data;
    const today = startOfUtcDay(clock());

    const settings = await settingRepo.getAll();
    const currency = settings?.currency ?? "USD";

    try {
      return await deps.db.transaction(async (tx) => {
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

          if (
            !product ||
            !product.isActive ||
            product.storeId !== deps.storeId
          ) {
            unavailableItems.push(item.productId);
            continue;
          }

          const variant = item.variantId
            ? product.variants?.find((v) => v.id === item.variantId)
            : null;

          if (item.variantId && (!variant || !variant.isActive)) {
            unavailableItems.push(product.name);
            continue;
          }

          const stock = variant ? variant.stock : product.stock ?? 1;
          const date = parseDateOnly(item.date);

          if (date < today) {
            return {
              success: false as const,
              problem: validationProblem(
                new z.ZodError([
                  {
                    code: z.ZodIssueCode.custom,
                    path: ["items"],
                    message: "la fecha debe ser hoy o posterior",
                  },
                ]),
              ),
            };
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
          throw new ManualOrderUnavailableError(unavailableItems);
        }

        const subtotal = validatedItems.reduce(
          (sum, item) => sum + item.unitPrice * item.quantity,
          0,
        );
        const total = subtotal;
        const paymentStatus =
          data.amountPaid + 0.001 >= total ? "CAPTURED" : "AUTHORIZED";

        const [order] = await tx
          .insert(orders)
          .values({
            storeId: deps.storeId,
            customerName: data.customerName,
            customerEmail: data.customerEmail,
            customerPhone: data.customerPhone,
            deliveryAddress: data.deliveryAddress || null,
            subtotal: subtotal.toFixed(2),
            depositAmount: "0",
            deliveryFee: "0",
            // ADR-009: manual orders don't support service selection yet
            // (out of scope for Phase 4). Explicit 0; revisit in a follow-up.
            servicesTotal: "0",
            total: total.toFixed(2),
            amountPaid: data.amountPaid.toFixed(2),
            paymentStatus,
            paymentMethod: data.paymentMethod,
            status: "CONFIRMED",
            currency,
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

        await audit(
          {
            userId: deps.userId,
            action: "order.create_manual",
            entity: "order",
            entityId: order.id,
            after: {
              id: order.id,
              total: order.total,
              amountPaid: order.amountPaid,
              paymentStatus: order.paymentStatus,
              paymentMethod: order.paymentMethod,
              status: order.status,
              itemCount: validatedItems.length,
            },
          },
          tx,
        );

        return { success: true as const, orderId: order.id };
      });
    } catch (error) {
      if (error instanceof ManualOrderUnavailableError) {
        return {
          success: false,
          problem: validationProblem(
            new z.ZodError([
              {
                code: z.ZodIssueCode.custom,
                path: ["items"],
                message: "Some items are no longer available",
              },
            ]),
            "Some items are no longer available",
          ),
          unavailableItems: error.items,
        };
      }
      throw error;
    }
  }

  return { createManualOrder };
}

export type ManualOrderService = ReturnType<typeof createManualOrderService>;

class ManualOrderUnavailableError extends Error {
  constructor(public items: string[]) {
    super(`UNAVAILABLE:${items.join(",")}`);
    this.name = "ManualOrderUnavailableError";
  }
}
