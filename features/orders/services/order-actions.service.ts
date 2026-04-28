import "server-only";

import { and, eq } from "drizzle-orm";

import { recordAudit } from "@/lib/audit";
import { type Database } from "@/lib/db";
import { availability, orders } from "@/lib/db/schema";
import {
  forbiddenProblem,
  notFoundProblem,
  validationProblem,
} from "@/lib/problems";
import type { ProblemDetail } from "@/lib/types/problem-detail";
import { z } from "zod";

type RecordAudit = typeof recordAudit;

export type OrderActionsServiceDeps = {
  db: Database;
  storeId: string;
  userId: string;
  recordAudit?: RecordAudit;
};

export type MarkPaidResult =
  | { success: true }
  | { success: false; problem: ProblemDetail };

export type CancelOrderResult =
  | { success: true; warning?: "stripe_captured_no_refund" }
  | { success: false; problem: ProblemDetail };

const markPaidSchema = z.object({
  paymentMethod: z.enum(["CASH", "TRANSFER"]),
});

export function createOrderActionsService(deps: OrderActionsServiceDeps) {
  const audit = deps.recordAudit ?? recordAudit;
  const { db: dbx, storeId, userId } = deps;

  async function markOrderAsPaid(
    orderId: string,
    paymentMethod: "CASH" | "TRANSFER",
  ): Promise<MarkPaidResult> {
    const parsed = markPaidSchema.safeParse({ paymentMethod });
    if (!parsed.success) {
      return { success: false, problem: validationProblem(parsed.error) };
    }

    const order = await dbx.query.orders.findFirst({
      where: and(eq(orders.id, orderId), eq(orders.storeId, storeId)),
    });

    if (!order) {
      return { success: false, problem: notFoundProblem("Orden no encontrada") };
    }

    if (order.stripeSessionId) {
      return {
        success: false,
        problem: forbiddenProblem(
          "Las órdenes de Stripe se reconcilian por webhooks; no se pueden marcar como pagadas manualmente",
        ),
      };
    }

    if (order.paymentStatus !== "AUTHORIZED") {
      return {
        success: false,
        problem: forbiddenProblem(
          `No se puede marcar como pagada: la orden está ${order.paymentStatus}`,
        ),
      };
    }

    return dbx.transaction(async (tx) => {
      await tx
        .update(orders)
        .set({
          paymentStatus: "CAPTURED",
          paymentMethod: parsed.data.paymentMethod,
          amountPaid: order.total,
        })
        .where(and(eq(orders.id, orderId), eq(orders.storeId, storeId)));

      await audit(
        {
          userId,
          action: "order.mark_paid",
          entity: "order",
          entityId: orderId,
          before: {
            paymentStatus: order.paymentStatus,
            paymentMethod: order.paymentMethod,
            amountPaid: order.amountPaid,
          },
          after: {
            paymentStatus: "CAPTURED",
            paymentMethod: parsed.data.paymentMethod,
            amountPaid: order.total,
          },
        },
        tx,
      );

      return { success: true as const };
    });
  }

  async function cancelOrder(orderId: string): Promise<CancelOrderResult> {
    const order = await dbx.query.orders.findFirst({
      where: and(eq(orders.id, orderId), eq(orders.storeId, storeId)),
    });

    if (!order) {
      return { success: false, problem: notFoundProblem("Orden no encontrada") };
    }

    if (
      order.status === "CANCELLED" ||
      order.status === "DELIVERED" ||
      order.status === "RETURNED"
    ) {
      return {
        success: false,
        problem: forbiddenProblem(
          `No se puede cancelar: la orden ya está ${order.status}`,
        ),
      };
    }

    const isStripeCaptured =
      Boolean(order.stripeSessionId) && order.paymentStatus === "CAPTURED";
    const newPaymentStatus = isStripeCaptured ? "CAPTURED" : "VOIDED";

    return dbx.transaction(async (tx) => {
      await tx.delete(availability).where(eq(availability.orderId, orderId));

      await tx
        .update(orders)
        .set({
          status: "CANCELLED",
          paymentStatus: newPaymentStatus,
        })
        .where(and(eq(orders.id, orderId), eq(orders.storeId, storeId)));

      await audit(
        {
          userId,
          action: "order.cancel",
          entity: "order",
          entityId: orderId,
          before: {
            status: order.status,
            paymentStatus: order.paymentStatus,
          },
          after: {
            status: "CANCELLED",
            paymentStatus: newPaymentStatus,
          },
        },
        tx,
      );

      return isStripeCaptured
        ? { success: true as const, warning: "stripe_captured_no_refund" as const }
        : { success: true as const };
    });
  }

  return { markOrderAsPaid, cancelOrder };
}

export type OrderActionsService = ReturnType<typeof createOrderActionsService>;
