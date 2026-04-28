import { describe, expect, it } from "vitest";

import {
  buildScheduleDay,
  buildScheduleEntries,
  type ScheduleSourceItem,
} from "./schedule.service";

function localDate(y: number, m: number, d: number, h = 12, min = 0) {
  return new Date(y, m - 1, d, h, min, 0, 0);
}

function buildItem(partial: Partial<ScheduleSourceItem> = {}): ScheduleSourceItem {
  return {
    order: {
      id: "order-1",
      customerName: "Jane",
      customerPhone: "555",
      deliveryAddress: null,
      storeId: "store-1",
    },
    product: { name: "Chair" },
    variant: null,
    quantity: 1,
    rentDate: localDate(2026, 6, 10),
    ...partial,
  };
}

describe("orders schedule service", () => {
  describe("buildScheduleDay", () => {
    it("given a date -> day window starts at 00:00 and ends at 23:59.999", () => {
      const date = localDate(2026, 6, 10, 14);

      const day = buildScheduleDay(date);

      expect(day.start.getHours()).toBe(0);
      expect(day.end.getHours()).toBe(23);
      expect(day.end.getMilliseconds()).toBe(999);
    });
  });

  describe("buildScheduleEntries", () => {
    it("item with rent_date in range -> single entry", () => {
      const day = buildScheduleDay(localDate(2026, 6, 10));
      const items = [buildItem({ rentDate: localDate(2026, 6, 10, 10) })];

      const result = buildScheduleEntries(items, day, "store-1");

      expect(result).toHaveLength(1);
      expect(result[0]?.orderId).toBe("order-1");
    });

    it("item with rent_date outside range -> excluded", () => {
      const day = buildScheduleDay(localDate(2026, 6, 10));
      const items = [buildItem({ rentDate: localDate(2026, 6, 11, 10) })];

      const result = buildScheduleEntries(items, day, "store-1");

      expect(result).toEqual([]);
    });

    it("item from other store -> excluded", () => {
      const day = buildScheduleDay(localDate(2026, 6, 10));
      const items = [
        buildItem({
          order: {
            id: "other-order",
            customerName: "X",
            customerPhone: "X",
            deliveryAddress: null,
            storeId: "store-99",
          },
          rentDate: localDate(2026, 6, 10, 10),
        }),
      ];

      const result = buildScheduleEntries(items, day, "store-1");

      expect(result).toEqual([]);
    });

    it("quantity > 1 and variant present -> summary shows count and variant name", () => {
      const day = buildScheduleDay(localDate(2026, 6, 10));
      const items = [
        buildItem({
          quantity: 3,
          variant: { name: "Red" },
          rentDate: localDate(2026, 6, 10, 8),
        }),
      ];

      const result = buildScheduleEntries(items, day, "store-1");

      expect(result[0]?.itemsSummary).toBe("3× Chair (Red)");
    });

    it("two items from same order -> grouped into one entry with joined summary", () => {
      const day = buildScheduleDay(localDate(2026, 6, 10));
      const sharedOrder = {
        id: "order-1",
        customerName: "Jane",
        customerPhone: "555",
        deliveryAddress: null,
        storeId: "store-1",
      };
      const items = [
        buildItem({
          order: sharedOrder,
          product: { name: "Chair" },
          rentDate: localDate(2026, 6, 10, 10),
        }),
        buildItem({
          order: sharedOrder,
          product: { name: "Table" },
          rentDate: localDate(2026, 6, 10, 11),
        }),
      ];

      const result = buildScheduleEntries(items, day, "store-1");

      expect(result).toHaveLength(1);
      expect(result[0]?.itemsSummary).toBe("Chair, Table");
    });
  });
});
