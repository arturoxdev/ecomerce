import { describe, expect, it } from "vitest";

import {
  parseAndValidateManualBlock,
  parseManualBlockForm,
  validateManualBlockDates,
  type Clock,
} from "./manual-block.service";

function fixedClock(iso: string): Clock {
  const date = new Date(iso);
  return { now: () => date };
}

function buildFormData(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    fd.set(key, value);
  }
  return fd;
}

describe("manual-block service", () => {
  describe("parseManualBlockForm", () => {
    it("valid dates -> parsed Date objects", () => {
      // Arrange
      const fd = buildFormData({
        startDate: "2026-05-01",
        endDate: "2026-05-03",
        reason: "Maintenance",
      });

      // Act
      const result = parseManualBlockForm(fd);

      // Assert
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.startDate).toBeInstanceOf(Date);
      expect(result.data.reason).toBe("Maintenance");
    });

    it("invalid date -> validation error", () => {
      // Arrange
      const fd = buildFormData({
        startDate: "not-a-date",
        endDate: "2026-05-03",
      });

      // Act
      const result = parseManualBlockForm(fd);

      // Assert
      expect(result.success).toBe(false);
    });

    it("reason over 255 chars -> validation error", () => {
      // Arrange
      const fd = buildFormData({
        startDate: "2026-05-01",
        endDate: "2026-05-03",
        reason: "x".repeat(256),
      });

      // Act
      const result = parseManualBlockForm(fd);

      // Assert
      expect(result.success).toBe(false);
    });
  });

  describe("validateManualBlockDates", () => {
    it("start in the past with fixed clock -> validation problem", () => {
      // Arrange
      const clock = fixedClock("2026-06-15T10:00:00Z");
      const input = {
        startDate: new Date("2026-06-01"),
        endDate: new Date("2026-06-05"),
      };

      // Act
      const result = validateManualBlockDates(input, clock);

      // Assert
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.problem.fieldErrors?.startDate?.[0]).toBe(
        "Start date cannot be in the past",
      );
    });

    it("start today with fixed clock -> accepted", () => {
      // Arrange
      const clock = fixedClock("2026-06-15T23:00:00Z");
      const input = {
        startDate: new Date("2026-06-16"),
        endDate: new Date("2026-06-18"),
      };

      // Act
      const result = validateManualBlockDates(input, clock);

      // Assert
      expect(result.ok).toBe(true);
    });

    it("end before start -> validation problem on endDate", () => {
      // Arrange
      const clock = fixedClock("2026-06-01T00:00:00Z");
      const input = {
        startDate: new Date("2026-06-20"),
        endDate: new Date("2026-06-15"),
      };

      // Act
      const result = validateManualBlockDates(input, clock);

      // Assert
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.problem.fieldErrors?.endDate?.[0]).toBe(
        "End date must be after start date",
      );
    });

    it("end equal to start -> validation problem", () => {
      // Arrange
      const clock = fixedClock("2026-06-01T00:00:00Z");
      const input = {
        startDate: new Date("2026-06-10"),
        endDate: new Date("2026-06-10"),
      };

      // Act
      const result = validateManualBlockDates(input, clock);

      // Assert
      expect(result.ok).toBe(false);
    });

    it("valid range -> ok true", () => {
      // Arrange
      const clock = fixedClock("2026-06-01T00:00:00Z");
      const input = {
        startDate: new Date("2026-06-10"),
        endDate: new Date("2026-06-12"),
      };

      // Act
      const result = validateManualBlockDates(input, clock);

      // Assert
      expect(result.ok).toBe(true);
    });
  });

  describe("parseAndValidateManualBlock", () => {
    it("parse error -> returns validationProblem shape", () => {
      // Arrange
      const fd = buildFormData({
        startDate: "invalid",
        endDate: "2026-06-15",
      });

      // Act
      const result = parseAndValidateManualBlock(fd);

      // Assert
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.problem.status).toBe(422);
    });

    it("valid parse but semantic invalid -> returns validation problem", () => {
      // Arrange
      const clock = fixedClock("2026-06-15T00:00:00Z");
      const fd = buildFormData({
        startDate: "2026-06-20",
        endDate: "2026-06-20",
      });

      // Act
      const result = parseAndValidateManualBlock(fd, clock);

      // Assert
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.problem.fieldErrors?.endDate).toBeDefined();
    });

    it("valid and semantic ok -> returns parsed data", () => {
      // Arrange
      const clock = fixedClock("2026-06-01T00:00:00Z");
      const fd = buildFormData({
        startDate: "2026-06-10",
        endDate: "2026-06-12",
        reason: "Event",
      });

      // Act
      const result = parseAndValidateManualBlock(fd, clock);

      // Assert
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.reason).toBe("Event");
    });
  });
});
