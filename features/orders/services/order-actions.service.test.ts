import { describe, expect, it, vi } from "vitest";

import { createOrderActionsService } from "./order-actions.service";

type OrderRow = {
  id: string;
  storeId: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "DELIVERED" | "RETURNED";
  paymentStatus: "AUTHORIZED" | "CAPTURED" | "VOIDED" | "FAILED" | "SUSPICIOUS";
  paymentMethod: "CASH" | "CARD" | "TRANSFER";
  amountPaid: string;
  total: string;
  stripeSessionId: string | null;
};

type StubTx = {
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
};

function buildDb(order: OrderRow | null) {
  const updateValues: Array<Record<string, unknown>> = [];
  const deletedFromAvailability: Array<{ orderId: string }> = [];

  const tx: StubTx = {
    update: vi.fn(() => ({
      set: vi.fn((values: Record<string, unknown>) => {
        updateValues.push(values);
        return {
          where: vi.fn(async () => undefined),
        };
      }),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(async (condition: unknown) => {
        deletedFromAvailability.push({ orderId: String(condition) });
        return undefined;
      }),
    })),
    insert: vi.fn(() => ({ values: vi.fn(async () => undefined) })),
  };

  const db = {
    query: {
      orders: {
        findFirst: vi.fn(async () => order ?? undefined),
      },
    },
    transaction: vi.fn(async (fn: (tx: StubTx) => Promise<unknown>) => fn(tx)),
  };

  return { db, tx, updateValues, deletedFromAvailability };
}

function makeOrder(overrides: Partial<OrderRow> = {}): OrderRow {
  return {
    id: "order-1",
    storeId: "store-A",
    status: "CONFIRMED",
    paymentStatus: "AUTHORIZED",
    paymentMethod: "CASH",
    amountPaid: "0.00",
    total: "100.00",
    stripeSessionId: null,
    ...overrides,
  };
}

describe("order-actions.service", () => {
  describe("markOrderAsPaid", () => {
    it("AUTHORIZED manual order -> CAPTURED with chosen method", async () => {
      const { db, updateValues } = buildDb(makeOrder());
      const audit = vi.fn(async () => undefined);
      const service = createOrderActionsService({
        db: db as never,
        storeId: "store-A",
        userId: "user-1",
        recordAudit: audit,
      });

      const result = await service.markOrderAsPaid("order-1", "TRANSFER");

      expect(result.success).toBe(true);
      expect(updateValues[0]?.paymentStatus).toBe("CAPTURED");
      expect(updateValues[0]?.paymentMethod).toBe("TRANSFER");
      expect(updateValues[0]?.amountPaid).toBe("100.00");
      expect(audit).toHaveBeenCalledTimes(1);
    });

    it("Stripe order -> rejected", async () => {
      const { db } = buildDb(
        makeOrder({ stripeSessionId: "cs_test_123", paymentMethod: "CARD" }),
      );
      const service = createOrderActionsService({
        db: db as never,
        storeId: "store-A",
        userId: "user-1",
        recordAudit: vi.fn(async () => undefined),
      });

      const result = await service.markOrderAsPaid("order-1", "CASH");

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.problem.status).toBe(403);
    });

    it("CAPTURED order -> rejected", async () => {
      const { db } = buildDb(makeOrder({ paymentStatus: "CAPTURED" }));
      const service = createOrderActionsService({
        db: db as never,
        storeId: "store-A",
        userId: "user-1",
        recordAudit: vi.fn(async () => undefined),
      });

      const result = await service.markOrderAsPaid("order-1", "CASH");

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.problem.status).toBe(403);
    });

    it("missing order -> notFound", async () => {
      const { db } = buildDb(null);
      const service = createOrderActionsService({
        db: db as never,
        storeId: "store-A",
        userId: "user-1",
        recordAudit: vi.fn(async () => undefined),
      });

      const result = await service.markOrderAsPaid("order-x", "CASH");

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.problem.status).toBe(404);
    });
  });

  describe("cancelOrder", () => {
    it("manual AUTHORIZED -> CANCELLED + VOIDED + availability liberada", async () => {
      const { db, updateValues, deletedFromAvailability } = buildDb(
        makeOrder(),
      );
      const audit = vi.fn(async () => undefined);
      const service = createOrderActionsService({
        db: db as never,
        storeId: "store-A",
        userId: "user-1",
        recordAudit: audit,
      });

      const result = await service.cancelOrder("order-1");

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.warning).toBeUndefined();
      expect(updateValues[0]?.status).toBe("CANCELLED");
      expect(updateValues[0]?.paymentStatus).toBe("VOIDED");
      expect(deletedFromAvailability).toHaveLength(1);
      expect(audit).toHaveBeenCalledTimes(1);
    });

    it("manual CAPTURED -> CANCELLED + VOIDED", async () => {
      const { db, updateValues } = buildDb(
        makeOrder({ paymentStatus: "CAPTURED", amountPaid: "100.00" }),
      );
      const service = createOrderActionsService({
        db: db as never,
        storeId: "store-A",
        userId: "user-1",
        recordAudit: vi.fn(async () => undefined),
      });

      const result = await service.cancelOrder("order-1");

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(updateValues[0]?.paymentStatus).toBe("VOIDED");
    });

    it("Stripe CAPTURED -> CANCELLED but paymentStatus stays CAPTURED + warning", async () => {
      const { db, updateValues } = buildDb(
        makeOrder({
          stripeSessionId: "cs_test_123",
          paymentMethod: "CARD",
          paymentStatus: "CAPTURED",
        }),
      );
      const service = createOrderActionsService({
        db: db as never,
        storeId: "store-A",
        userId: "user-1",
        recordAudit: vi.fn(async () => undefined),
      });

      const result = await service.cancelOrder("order-1");

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.warning).toBe("stripe_captured_no_refund");
      expect(updateValues[0]?.status).toBe("CANCELLED");
      expect(updateValues[0]?.paymentStatus).toBe("CAPTURED");
    });

    it("Stripe AUTHORIZED -> VOIDED (refund irrelevante)", async () => {
      const { db, updateValues } = buildDb(
        makeOrder({
          stripeSessionId: "cs_test_123",
          paymentMethod: "CARD",
          paymentStatus: "AUTHORIZED",
        }),
      );
      const service = createOrderActionsService({
        db: db as never,
        storeId: "store-A",
        userId: "user-1",
        recordAudit: vi.fn(async () => undefined),
      });

      const result = await service.cancelOrder("order-1");

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.warning).toBeUndefined();
      expect(updateValues[0]?.paymentStatus).toBe("VOIDED");
    });

    it("already CANCELLED -> rejected (idempotency error)", async () => {
      const { db } = buildDb(makeOrder({ status: "CANCELLED" }));
      const service = createOrderActionsService({
        db: db as never,
        storeId: "store-A",
        userId: "user-1",
        recordAudit: vi.fn(async () => undefined),
      });

      const result = await service.cancelOrder("order-1");

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.problem.status).toBe(403);
    });

    it("DELIVERED -> rejected", async () => {
      const { db } = buildDb(makeOrder({ status: "DELIVERED" }));
      const service = createOrderActionsService({
        db: db as never,
        storeId: "store-A",
        userId: "user-1",
        recordAudit: vi.fn(async () => undefined),
      });

      const result = await service.cancelOrder("order-1");

      expect(result.success).toBe(false);
    });

    it("missing order -> notFound", async () => {
      const { db } = buildDb(null);
      const service = createOrderActionsService({
        db: db as never,
        storeId: "store-A",
        userId: "user-1",
        recordAudit: vi.fn(async () => undefined),
      });

      const result = await service.cancelOrder("order-x");

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.problem.status).toBe(404);
    });
  });
});
