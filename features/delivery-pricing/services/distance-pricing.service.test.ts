import { describe, expect, it } from "vitest";

import {
  selectTier,
  validateTiers,
  type DistanceTier,
} from "./distance-pricing.service";

const TIERS: DistanceTier[] = [
  { id: "t1", minMiles: 0, maxMiles: 5, fee: 20 },
  { id: "t2", minMiles: 5, maxMiles: 10, fee: 35 },
  { id: "t3", minMiles: 10, maxMiles: 15, fee: 50 },
];

describe("selectTier (half-open matching)", () => {
  it("0.0 mi -> first tier", () => {
    // Arrange / Act
    const result = selectTier({ miles: 0, tiers: TIERS });
    // Assert
    expect(result).toEqual({ ok: true, tier: TIERS[0] });
  });

  it("4.99 mi -> first tier", () => {
    const result = selectTier({ miles: 4.99, tiers: TIERS });
    expect(result).toEqual({ ok: true, tier: TIERS[0] });
  });

  it("5.0 mi -> second tier (lower bound inclusive)", () => {
    const result = selectTier({ miles: 5.0, tiers: TIERS });
    expect(result).toEqual({ ok: true, tier: TIERS[1] });
  });

  it("5.01 mi -> second tier", () => {
    const result = selectTier({ miles: 5.01, tiers: TIERS });
    expect(result).toEqual({ ok: true, tier: TIERS[1] });
  });

  it("14.99 mi (lastMax - eps) -> last tier", () => {
    const result = selectTier({ miles: 14.99, tiers: TIERS });
    expect(result).toEqual({ ok: true, tier: TIERS[2] });
  });

  it("15.0 mi (lastMax exactly) -> out of cap", () => {
    const result = selectTier({ miles: 15.0, tiers: TIERS });
    expect(result).toEqual({ ok: false, error: "OUT_OF_CAP", capMiles: 15 });
  });

  it("15.01 mi (lastMax + eps) -> out of cap", () => {
    const result = selectTier({ miles: 15.01, tiers: TIERS });
    expect(result).toEqual({ ok: false, error: "OUT_OF_CAP", capMiles: 15 });
  });

  it("unsorted input still matches correctly", () => {
    const shuffled = [TIERS[2], TIERS[0], TIERS[1]];
    const result = selectTier({ miles: 7, tiers: shuffled });
    expect(result).toEqual({ ok: true, tier: TIERS[1] });
  });

  it("single-tier table: in range -> match", () => {
    const single: DistanceTier[] = [{ id: "s", minMiles: 0, maxMiles: 3, fee: 0 }];
    const result = selectTier({ miles: 2.5, tiers: single });
    expect(result).toEqual({ ok: true, tier: single[0] });
  });

  it("single-tier table: at cap -> out of cap", () => {
    const single: DistanceTier[] = [{ id: "s", minMiles: 0, maxMiles: 3, fee: 0 }];
    const result = selectTier({ miles: 3, tiers: single });
    expect(result).toEqual({ ok: false, error: "OUT_OF_CAP", capMiles: 3 });
  });
});

describe("validateTiers", () => {
  it("contiguous tiers starting at 0 -> ok", () => {
    const result = validateTiers([
      { minMiles: 0, maxMiles: 5, fee: 20 },
      { minMiles: 5, maxMiles: 10, fee: 35 },
    ]);
    expect(result).toEqual({ ok: true });
  });

  it("free first tier (fee 0) -> ok", () => {
    const result = validateTiers([
      { minMiles: 0, maxMiles: 3, fee: 0 },
      { minMiles: 3, maxMiles: 10, fee: 25 },
    ]);
    expect(result.ok).toBe(true);
  });

  it("empty array -> EMPTY", () => {
    const result = validateTiers([]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe("EMPTY");
  });

  it("first tier min != 0 -> FIRST_NOT_ZERO", () => {
    const result = validateTiers([{ minMiles: 1, maxMiles: 5, fee: 20 }]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe("FIRST_NOT_ZERO");
  });

  it("negative fee -> NEGATIVE_FEE", () => {
    const result = validateTiers([{ minMiles: 0, maxMiles: 5, fee: -1 }]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe("NEGATIVE_FEE");
  });

  it("non-numeric value -> NON_NUMERIC", () => {
    const result = validateTiers([{ minMiles: 0, maxMiles: Number.NaN, fee: 20 }]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe("NON_NUMERIC");
  });

  it("min >= max -> BAD_RANGE", () => {
    const result = validateTiers([{ minMiles: 0, maxMiles: 0, fee: 20 }]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe("BAD_RANGE");
  });

  it("gap between tiers -> GAP", () => {
    const result = validateTiers([
      { minMiles: 0, maxMiles: 5, fee: 20 },
      { minMiles: 6, maxMiles: 10, fee: 35 },
    ]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe("GAP");
  });

  it("overlap between tiers -> OVERLAP", () => {
    const result = validateTiers([
      { minMiles: 0, maxMiles: 6, fee: 20 },
      { minMiles: 5, maxMiles: 10, fee: 35 },
    ]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe("OVERLAP");
  });
});
