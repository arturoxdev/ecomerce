import { describe, expect, it } from "vitest";

import {
  generateEventHours,
  isWholeHour,
  isWithinEventWindow,
} from "./event-window.service";

describe("event-window service", () => {
  describe("generateEventHours", () => {
    it("normal range ('09:00', '12:00') -> ['09:00', '10:00', '11:00', '12:00']", () => {
      // Arrange
      const start = "09:00";
      const end = "12:00";

      // Act
      const result = generateEventHours(start, end);

      // Assert
      expect(result).toEqual(["09:00", "10:00", "11:00", "12:00"]);
    });

    it("start == end ('09:00', '09:00') -> ['09:00']", () => {
      // Arrange
      const start = "09:00";
      const end = "09:00";

      // Act
      const result = generateEventHours(start, end);

      // Assert
      expect(result).toEqual(["09:00"]);
    });

    it("null start -> []", () => {
      // Arrange
      const start = null;
      const end = "12:00";

      // Act
      const result = generateEventHours(start, end);

      // Assert
      expect(result).toEqual([]);
    });

    it("null end -> []", () => {
      // Arrange
      const start = "09:00";
      const end = null;

      // Act
      const result = generateEventHours(start, end);

      // Assert
      expect(result).toEqual([]);
    });

    it("empty string start -> []", () => {
      // Arrange
      const start = "";
      const end = "12:00";

      // Act
      const result = generateEventHours(start, end);

      // Assert
      expect(result).toEqual([]);
    });

    it("empty string end -> []", () => {
      // Arrange
      const start = "09:00";
      const end = "";

      // Act
      const result = generateEventHours(start, end);

      // Assert
      expect(result).toEqual([]);
    });

    it("non-whole-hour start ('09:30') -> []", () => {
      // Arrange
      const start = "09:30";
      const end = "12:00";

      // Act
      const result = generateEventHours(start, end);

      // Assert
      expect(result).toEqual([]);
    });

    it("non-whole-hour end -> []", () => {
      // Arrange
      const start = "09:00";
      const end = "12:30";

      // Act
      const result = generateEventHours(start, end);

      // Assert
      expect(result).toEqual([]);
    });

    it("end < start ('12:00', '09:00') -> []", () => {
      // Arrange
      const start = "12:00";
      const end = "09:00";

      // Act
      const result = generateEventHours(start, end);

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe("isWithinEventWindow", () => {
    it("hour inside the window -> true", () => {
      // Arrange
      const time = "10:00";
      const start = "09:00";
      const end = "12:00";

      // Act
      const result = isWithinEventWindow(time, start, end);

      // Assert
      expect(result).toBe(true);
    });

    it("hour outside the window -> false", () => {
      // Arrange
      const time = "08:00";
      const start = "09:00";
      const end = "12:00";

      // Act
      const result = isWithinEventWindow(time, start, end);

      // Assert
      expect(result).toBe(false);
    });

    it("non-whole-hour time -> false", () => {
      // Arrange
      const time = "09:30";
      const start = "09:00";
      const end = "12:00";

      // Act
      const result = isWithinEventWindow(time, start, end);

      // Assert
      expect(result).toBe(false);
    });

    it("time == start (lower bound) -> true", () => {
      // Arrange
      const time = "09:00";
      const start = "09:00";
      const end = "12:00";

      // Act
      const result = isWithinEventWindow(time, start, end);

      // Assert
      expect(result).toBe(true);
    });

    it("time == end (upper bound) -> true", () => {
      // Arrange
      const time = "12:00";
      const start = "09:00";
      const end = "12:00";

      // Act
      const result = isWithinEventWindow(time, start, end);

      // Assert
      expect(result).toBe(true);
    });
  });

  describe("isWholeHour", () => {
    it("'09:00' -> true", () => {
      // Arrange
      const time = "09:00";

      // Act
      const result = isWholeHour(time);

      // Assert
      expect(result).toBe(true);
    });

    it("'09:30' -> false", () => {
      // Arrange
      const time = "09:30";

      // Act
      const result = isWholeHour(time);

      // Assert
      expect(result).toBe(false);
    });

    it("'9:00' (missing leading zero) -> false", () => {
      // Arrange
      const time = "9:00";

      // Act
      const result = isWholeHour(time);

      // Assert
      expect(result).toBe(false);
    });

    it("'24:00' (out of range) -> false", () => {
      // Arrange
      const time = "24:00";

      // Act
      const result = isWholeHour(time);

      // Assert
      expect(result).toBe(false);
    });

    it("'23:00' (last valid hour) -> true", () => {
      // Arrange
      const time = "23:00";

      // Act
      const result = isWholeHour(time);

      // Assert
      expect(result).toBe(true);
    });

    it("'00:00' (midnight) -> true", () => {
      // Arrange
      const time = "00:00";

      // Act
      const result = isWholeHour(time);

      // Assert
      expect(result).toBe(true);
    });
  });
});
