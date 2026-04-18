import { describe, expect, it } from "vitest";

import {
  buildScheduleDay,
  buildScheduleEntries,
  type ScheduleSourceItem,
} from "./schedule.service";

// Local-time Date constructor (month is 0-indexed). Using local components
// keeps tests stable regardless of the runner's timezone — matches how
// `buildScheduleDay` uses `setHours` (which is local).
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
    rentStartDate: localDate(2026, 6, 10),
    rentEndDate: localDate(2026, 6, 12),
    ...partial,
  };
}

describe("orders schedule service", () => {
  describe("buildScheduleDay", () => {
    it("given a date -> day window starts at 00:00 and ends at 23:59.999", () => {
      // Arrange
      const date = localDate(2026, 6, 10, 14);

      // Act
      const day = buildScheduleDay(date);

      // Assert
      expect(day.start.getHours()).toBe(0);
      expect(day.end.getHours()).toBe(23);
      expect(day.end.getMilliseconds()).toBe(999);
    });
  });

  describe("buildScheduleEntries", () => {
    it("only delivery on day -> single delivery entry", () => {
      // Arrange
      const day = buildScheduleDay(localDate(2026, 6, 10));
      const items = [
        buildItem({
          rentStartDate: localDate(2026, 6, 10, 10),
          rentEndDate: localDate(2026, 6, 15, 10),
        }),
      ];

      // Act
      const result = buildScheduleEntries(items, day, "store-1");

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]?.type).toBe("delivery");
    });

    it("only pickup on day -> single pickup entry", () => {
      // Arrange
      const day = buildScheduleDay(localDate(2026, 6, 12));
      const items = [
        buildItem({
          rentStartDate: localDate(2026, 6, 10),
          rentEndDate: localDate(2026, 6, 12, 15),
        }),
      ];

      // Act
      const result = buildScheduleEntries(items, day, "store-1");

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]?.type).toBe("pickup");
    });

    it("same-day delivery and pickup -> two entries with delivery first", () => {
      // Arrange
      const day = buildScheduleDay(localDate(2026, 6, 10));
      const items = [
        buildItem({
          rentStartDate: localDate(2026, 6, 10, 8),
          rentEndDate: localDate(2026, 6, 10, 20),
        }),
      ];

      // Act
      const result = buildScheduleEntries(items, day, "store-1");

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]?.type).toBe("delivery");
      expect(result[1]?.type).toBe("pickup");
    });

    it("item from other store -> excluded", () => {
      // Arrange
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
          rentStartDate: localDate(2026, 6, 10, 10),
          rentEndDate: localDate(2026, 6, 15, 10),
        }),
      ];

      // Act
      const result = buildScheduleEntries(items, day, "store-1");

      // Assert
      expect(result).toEqual([]);
    });

    it("quantity > 1 and variant present -> summary shows count and variant name", () => {
      // Arrange
      const day = buildScheduleDay(localDate(2026, 6, 10));
      const items = [
        buildItem({
          quantity: 3,
          variant: { name: "Red" },
          rentStartDate: localDate(2026, 6, 10, 8),
          rentEndDate: localDate(2026, 6, 15, 8),
        }),
      ];

      // Act
      const result = buildScheduleEntries(items, day, "store-1");

      // Assert
      expect(result[0]?.itemsSummary).toBe("3× Chair (Red)");
    });

    it("two items from same order -> grouped into one entry with joined summary", () => {
      // Arrange
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
          rentStartDate: localDate(2026, 6, 10, 10),
          rentEndDate: localDate(2026, 6, 15, 10),
        }),
        buildItem({
          order: sharedOrder,
          product: { name: "Table" },
          rentStartDate: localDate(2026, 6, 10, 11),
          rentEndDate: localDate(2026, 6, 15, 11),
        }),
      ];

      // Act
      const result = buildScheduleEntries(items, day, "store-1");

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]?.itemsSummary).toBe("Chair, Table");
    });
  });
});
