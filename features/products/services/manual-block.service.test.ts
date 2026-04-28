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
    it("valid date -> parsed Date object", () => {
      const fd = buildFormData({
        date: "2026-05-01",
        reason: "Maintenance",
      });

      const result = parseManualBlockForm(fd);

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.date).toBeInstanceOf(Date);
      expect(result.data.reason).toBe("Maintenance");
    });

    it("invalid date -> validation error", () => {
      const fd = buildFormData({
        date: "not-a-date",
      });

      const result = parseManualBlockForm(fd);

      expect(result.success).toBe(false);
    });

    it("reason over 255 chars -> validation error", () => {
      const fd = buildFormData({
        date: "2026-05-01",
        reason: "x".repeat(256),
      });

      const result = parseManualBlockForm(fd);

      expect(result.success).toBe(false);
    });
  });

  describe("validateManualBlockDates", () => {
    it("date in the past with fixed clock -> validation problem", () => {
      const clock = fixedClock("2026-06-15T10:00:00Z");
      const input = { date: new Date("2026-06-01") };

      const result = validateManualBlockDates(input, clock);

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.problem.fieldErrors?.date?.[0]).toBe(
        "La fecha no puede estar en el pasado",
      );
    });

    it("date today with fixed clock -> accepted (admin can block today)", () => {
      const clock = fixedClock("2026-06-15T12:00:00Z");
      const input = { date: new Date(2026, 5, 16) };

      const result = validateManualBlockDates(input, clock);

      expect(result.ok).toBe(true);
    });

    it("future date -> ok", () => {
      const clock = fixedClock("2026-06-01T00:00:00Z");
      const input = { date: new Date("2026-06-10") };

      const result = validateManualBlockDates(input, clock);

      expect(result.ok).toBe(true);
    });
  });

  describe("parseAndValidateManualBlock", () => {
    it("parse error -> returns validationProblem shape", () => {
      const fd = buildFormData({
        date: "invalid",
      });

      const result = parseAndValidateManualBlock(fd);

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.problem.status).toBe(422);
    });

    it("valid parse but date in past -> returns validation problem", () => {
      const clock = fixedClock("2026-06-15T00:00:00Z");
      const fd = buildFormData({
        date: "2026-06-10",
      });

      const result = parseAndValidateManualBlock(fd, clock);

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.problem.fieldErrors?.date).toBeDefined();
    });

    it("valid and ok -> returns parsed data", () => {
      const clock = fixedClock("2026-06-01T00:00:00Z");
      const fd = buildFormData({
        date: "2026-06-10",
        reason: "Event",
      });

      const result = parseAndValidateManualBlock(fd, clock);

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.reason).toBe("Event");
    });
  });
});
