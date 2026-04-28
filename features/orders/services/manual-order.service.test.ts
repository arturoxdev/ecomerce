import { describe, expect, it, vi } from "vitest";

import { createManualOrderService } from "./manual-order.service";

vi.mock("@/lib/data/settings", () => ({
  getAll: vi.fn(async () => ({ currency: "USD" })),
}));

const TODAY = new Date("2026-04-28T00:00:00.000Z");

function buildProduct(overrides: Partial<{
  id: string;
  name: string;
  basePrice: string;
  stock: number | null;
  isActive: boolean;
  storeId: string;
  variants: Array<{ id: string; price: string; stock: number; isActive: boolean }>;
}> = {}) {
  return {
    id: overrides.id ?? "11111111-1111-4111-8111-111111111111",
    name: overrides.name ?? "Bouncy Castle",
    basePrice: overrides.basePrice ?? "100.00",
    stock: overrides.stock === undefined ? 1 : overrides.stock,
    isActive: overrides.isActive ?? true,
    storeId: overrides.storeId ?? "store-A",
    variants: overrides.variants ?? [],
  };
}

type StubTx = {
  execute: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
};

function buildTx(opts: { occupied?: number } = {}) {
  const insertedOrders: Array<Record<string, unknown>> = [];
  const insertedItems: Array<Record<string, unknown>> = [];
  const insertedAvailability: Array<Record<string, unknown>> = [];
  const auditCalls: Array<unknown> = [];

  const tx: StubTx = {
    execute: vi.fn(async () => ({
      rows: [{ occupied: opts.occupied ?? 0 }],
    })),
    insert: vi.fn(() => ({
      values: vi.fn((row: Record<string, unknown>) => {
        // Heuristic: route by columns we recognize
        if ("customerName" in row) {
          insertedOrders.push(row);
          return {
            returning: vi.fn(async () => [
              {
                id: "order-id-1",
                total: row.total,
                amountPaid: row.amountPaid,
                paymentStatus: row.paymentStatus,
                paymentMethod: row.paymentMethod,
                status: row.status,
              },
            ]),
          };
        }
        if ("rentDate" in row) {
          insertedItems.push(row);
        } else {
          insertedAvailability.push(row);
        }
        return Promise.resolve();
      }),
    })),
  };

  const db = {
    transaction: vi.fn(async (fn: (tx: StubTx) => Promise<unknown>) =>
      fn(tx),
    ),
  };

  return { db, tx, insertedOrders, insertedItems, insertedAvailability, auditCalls };
}

describe("manual-order.service", () => {
  describe("validation", () => {
    it("rejects empty items -> validation problem", async () => {
      const { db } = buildTx();
      const service = createManualOrderService({
        db: db as never,
        storeId: "store-A",
        userId: "user-1",
        clock: () => TODAY,
        findProductByIdWithVariants: vi.fn(),
      });

      const result = await service.createManualOrder({
        customerName: "Jane",
        customerEmail: "jane@example.com",
        customerPhone: "555",
        items: [],
        amountPaid: 0,
        paymentMethod: "CASH",
      });

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.problem.status).toBe(422);
    });

    it("rejects amountPaid > total -> validation problem", async () => {
      const { db } = buildTx();
      const service = createManualOrderService({
        db: db as never,
        storeId: "store-A",
        userId: "user-1",
        clock: () => TODAY,
        findProductByIdWithVariants: vi.fn(async () => buildProduct()),
      });

      const result = await service.createManualOrder({
        customerName: "Jane",
        customerEmail: "jane@example.com",
        customerPhone: "555",
        items: [
          {
            productId: "11111111-1111-4111-8111-111111111111",
            variantId: null,
            quantity: 1,
            unitPrice: 100,
            date: "2026-05-10",
          },
        ],
        amountPaid: 200,
        paymentMethod: "CASH",
      });

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.problem.fieldErrors?.amountPaid).toBeDefined();
    });

    it("rejects CARD as paymentMethod -> validation problem", async () => {
      const { db } = buildTx();
      const service = createManualOrderService({
        db: db as never,
        storeId: "store-A",
        userId: "user-1",
        clock: () => TODAY,
        findProductByIdWithVariants: vi.fn(async () => buildProduct()),
      });

      const result = await service.createManualOrder({
        customerName: "Jane",
        customerEmail: "jane@example.com",
        customerPhone: "555",
        items: [
          {
            productId: "11111111-1111-4111-8111-111111111111",
            variantId: null,
            quantity: 1,
            unitPrice: 100,
            date: "2026-05-10",
          },
        ],
        amountPaid: 0,
        // @ts-expect-error -- explicitly testing CARD rejection
        paymentMethod: "CARD",
      });

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.problem.fieldErrors?.paymentMethod).toBeDefined();
    });

    it("rejects date in the past -> validation problem", async () => {
      const { db } = buildTx();
      const service = createManualOrderService({
        db: db as never,
        storeId: "store-A",
        userId: "user-1",
        clock: () => TODAY,
        findProductByIdWithVariants: vi.fn(async () => buildProduct()),
      });

      const result = await service.createManualOrder({
        customerName: "Jane",
        customerEmail: "jane@example.com",
        customerPhone: "555",
        items: [
          {
            productId: "11111111-1111-4111-8111-111111111111",
            variantId: null,
            quantity: 1,
            unitPrice: 100,
            date: "2026-04-27", // yesterday
          },
        ],
        amountPaid: 0,
        paymentMethod: "CASH",
      });

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.problem.status).toBe(422);
    });

    it("accepts date == today -> proceeds (Q2: admin reserva HOY)", async () => {
      const { db, insertedOrders } = buildTx();
      const service = createManualOrderService({
        db: db as never,
        storeId: "store-A",
        userId: "user-1",
        clock: () => TODAY,
        findProductByIdWithVariants: vi.fn(async () => buildProduct()),
        recordAudit: vi.fn(async () => undefined),
      });

      const result = await service.createManualOrder({
        customerName: "Jane",
        customerEmail: "jane@example.com",
        customerPhone: "555",
        items: [
          {
            productId: "11111111-1111-4111-8111-111111111111",
            variantId: null,
            quantity: 1,
            unitPrice: 100,
            date: "2026-04-28", // today
          },
        ],
        amountPaid: 0,
        paymentMethod: "CASH",
      });

      expect(result.success).toBe(true);
      expect(insertedOrders).toHaveLength(1);
    });
  });

  describe("payment status (Q4/Q5)", () => {
    it("amountPaid >= total -> CAPTURED", async () => {
      const { db, insertedOrders } = buildTx();
      const service = createManualOrderService({
        db: db as never,
        storeId: "store-A",
        userId: "user-1",
        clock: () => TODAY,
        findProductByIdWithVariants: vi.fn(async () => buildProduct()),
        recordAudit: vi.fn(async () => undefined),
      });

      const result = await service.createManualOrder({
        customerName: "Jane",
        customerEmail: "jane@example.com",
        customerPhone: "555",
        items: [
          {
            productId: "11111111-1111-4111-8111-111111111111",
            variantId: null,
            quantity: 1,
            unitPrice: 100,
            date: "2026-05-10",
          },
        ],
        amountPaid: 100,
        paymentMethod: "CASH",
      });

      expect(result.success).toBe(true);
      expect(insertedOrders[0]?.paymentStatus).toBe("CAPTURED");
      expect(insertedOrders[0]?.status).toBe("CONFIRMED");
      expect(insertedOrders[0]?.paymentMethod).toBe("CASH");
    });

    it("amountPaid < total -> AUTHORIZED with status CONFIRMED", async () => {
      const { db, insertedOrders } = buildTx();
      const service = createManualOrderService({
        db: db as never,
        storeId: "store-A",
        userId: "user-1",
        clock: () => TODAY,
        findProductByIdWithVariants: vi.fn(async () => buildProduct()),
        recordAudit: vi.fn(async () => undefined),
      });

      const result = await service.createManualOrder({
        customerName: "Jane",
        customerEmail: "jane@example.com",
        customerPhone: "555",
        items: [
          {
            productId: "11111111-1111-4111-8111-111111111111",
            variantId: null,
            quantity: 1,
            unitPrice: 100,
            date: "2026-05-10",
          },
        ],
        amountPaid: 40,
        paymentMethod: "TRANSFER",
      });

      expect(result.success).toBe(true);
      expect(insertedOrders[0]?.paymentStatus).toBe("AUTHORIZED");
      expect(insertedOrders[0]?.status).toBe("CONFIRMED");
      expect(insertedOrders[0]?.paymentMethod).toBe("TRANSFER");
    });
  });

  describe("multi-tenant", () => {
    it("rejects product from another store -> unavailable", async () => {
      const { db } = buildTx();
      const service = createManualOrderService({
        db: db as never,
        storeId: "store-A",
        userId: "user-1",
        clock: () => TODAY,
        findProductByIdWithVariants: vi.fn(async () =>
          buildProduct({ storeId: "store-B" }),
        ),
        recordAudit: vi.fn(async () => undefined),
      });

      const result = await service.createManualOrder({
        customerName: "Jane",
        customerEmail: "jane@example.com",
        customerPhone: "555",
        items: [
          {
            productId: "11111111-1111-4111-8111-111111111111",
            variantId: null,
            quantity: 1,
            unitPrice: 100,
            date: "2026-05-10",
          },
        ],
        amountPaid: 0,
        paymentMethod: "CASH",
      });

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.unavailableItems).toBeDefined();
    });

    it("rejects inactive product -> unavailable", async () => {
      const { db } = buildTx();
      const service = createManualOrderService({
        db: db as never,
        storeId: "store-A",
        userId: "user-1",
        clock: () => TODAY,
        findProductByIdWithVariants: vi.fn(async () =>
          buildProduct({ isActive: false }),
        ),
        recordAudit: vi.fn(async () => undefined),
      });

      const result = await service.createManualOrder({
        customerName: "Jane",
        customerEmail: "jane@example.com",
        customerPhone: "555",
        items: [
          {
            productId: "11111111-1111-4111-8111-111111111111",
            variantId: null,
            quantity: 1,
            unitPrice: 100,
            date: "2026-05-10",
          },
        ],
        amountPaid: 0,
        paymentMethod: "CASH",
      });

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.unavailableItems).toBeDefined();
    });
  });

  describe("availability conflict", () => {
    it("FIXED product already taken -> unavailable", async () => {
      const { db } = buildTx({ occupied: 1 });
      const service = createManualOrderService({
        db: db as never,
        storeId: "store-A",
        userId: "user-1",
        clock: () => TODAY,
        findProductByIdWithVariants: vi.fn(async () =>
          buildProduct({ stock: 1 }),
        ),
        recordAudit: vi.fn(async () => undefined),
      });

      const result = await service.createManualOrder({
        customerName: "Jane",
        customerEmail: "jane@example.com",
        customerPhone: "555",
        items: [
          {
            productId: "11111111-1111-4111-8111-111111111111",
            variantId: null,
            quantity: 1,
            unitPrice: 100,
            date: "2026-05-10",
          },
        ],
        amountPaid: 0,
        paymentMethod: "CASH",
      });

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.unavailableItems).toEqual(["Bouncy Castle"]);
    });
  });

  describe("audit", () => {
    it("records order.create_manual on success", async () => {
      const { db } = buildTx();
      const auditMock = vi.fn(async () => undefined);
      const service = createManualOrderService({
        db: db as never,
        storeId: "store-A",
        userId: "user-1",
        clock: () => TODAY,
        findProductByIdWithVariants: vi.fn(async () => buildProduct()),
        recordAudit: auditMock,
      });

      await service.createManualOrder({
        customerName: "Jane",
        customerEmail: "jane@example.com",
        customerPhone: "555",
        items: [
          {
            productId: "11111111-1111-4111-8111-111111111111",
            variantId: null,
            quantity: 1,
            unitPrice: 100,
            date: "2026-05-10",
          },
        ],
        amountPaid: 0,
        paymentMethod: "CASH",
      });

      expect(auditMock).toHaveBeenCalledTimes(1);
      const calls = auditMock.mock.calls as unknown as Array<
        [{ action: string; userId: string; entity: string }, unknown]
      >;
      const entry = calls[0][0];
      expect(entry.action).toBe("order.create_manual");
      expect(entry.userId).toBe("user-1");
      expect(entry.entity).toBe("order");
    });
  });
});
