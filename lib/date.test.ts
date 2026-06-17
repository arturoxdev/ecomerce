import { describe, expect, it } from "vitest";

import { parseDateOnly, toDateOnlyString, toDisplayDate } from "./date";

describe("date", () => {
  describe("toDisplayDate", () => {
    it("date stored at midnight UTC -> local Y/M/D keep the calendar day", () => {
      // Arrange — how a rent date enters the DB via parseDateOnly
      const stored = parseDateOnly("2026-06-23");

      // Act
      const display = toDisplayDate(stored);

      // Assert — local getters (used by Intl/date-fns) read June 23, not 22
      expect(display.getFullYear()).toBe(2026);
      expect(display.getMonth()).toBe(5); // 0-indexed -> June
      expect(display.getDate()).toBe(23);
    });

    it("ISO UTC string (as emitted by schedule.service) -> same calendar day", () => {
      // Arrange — schedule.service serializes rentDate with toISOString()
      const iso = "2026-06-23T00:00:00.000Z";

      // Act
      const display = toDisplayDate(iso);

      // Assert
      expect(display.getFullYear()).toBe(2026);
      expect(display.getMonth()).toBe(5);
      expect(display.getDate()).toBe(23);
    });

    it("date-only string -> same calendar day", () => {
      // Arrange
      const input = "2026-06-23";

      // Act
      const display = toDisplayDate(input);

      // Assert
      expect(display.getDate()).toBe(23);
      expect(display.getMonth()).toBe(5);
    });

    it("late UTC hour -> keeps the UTC calendar day (no rollover)", () => {
      // Arrange — an instant still on June 23 in UTC
      const lateUtc = "2026-06-23T23:30:00.000Z";

      // Act
      const display = toDisplayDate(lateUtc);

      // Assert
      expect(display.getDate()).toBe(23);
    });

    it("round-trips through toDateOnlyString without shifting the day", () => {
      // Arrange
      const stored = parseDateOnly("2026-12-31");

      // Act
      const display = toDisplayDate(stored);

      // Assert — the displayed day matches the original date-only string
      expect(toDateOnlyString(stored)).toBe("2026-12-31");
      expect(display.getDate()).toBe(31);
      expect(display.getMonth()).toBe(11);
    });
  });
});
