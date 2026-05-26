/**
 * Pure tier-matching and tier-validation logic. No I/O, no DB, no Google.
 *
 * Distance tiers describe half-open intervals `[minMiles, maxMiles)`. The cap
 * (the furthest we deliver) is the `maxMiles` of the last tier — there is no
 * separate cap value.
 */

export type DistanceTier = {
  id: string;
  minMiles: number;
  maxMiles: number;
  fee: number;
};

/** Tier shape before persistence (no id yet), used for validation. */
export type TierBounds = {
  minMiles: number;
  maxMiles: number;
  fee: number;
};

export type SelectTierResult =
  | { ok: true; tier: DistanceTier }
  | { ok: false; error: "OUT_OF_CAP"; capMiles: number };

// Values are stored as numeric(_, 2); a tiny epsilon absorbs float noise from
// parseFloat without ever masking a real gap/overlap (those are >= 0.01).
const EPS = 1e-6;

function byMinMiles<T extends { minMiles: number }>(a: T, b: T): number {
  return a.minMiles - b.minMiles;
}

/**
 * Returns the tier whose half-open interval contains `miles`, or `OUT_OF_CAP`
 * with the cap (last tier's maxMiles) when the destination is too far.
 */
export function selectTier(input: {
  miles: number;
  tiers: DistanceTier[];
}): SelectTierResult {
  const sorted = [...input.tiers].sort(byMinMiles);
  const capMiles = sorted.length > 0 ? sorted[sorted.length - 1].maxMiles : 0;

  const match = sorted.find(
    (tier) =>
      input.miles >= tier.minMiles - EPS && input.miles < tier.maxMiles - EPS,
  );

  if (match) {
    return { ok: true, tier: match };
  }
  return { ok: false, error: "OUT_OF_CAP", capMiles };
}

export type ValidateTiersError =
  | "EMPTY"
  | "NON_NUMERIC"
  | "NEGATIVE_FEE"
  | "BAD_RANGE"
  | "FIRST_NOT_ZERO"
  | "GAP"
  | "OVERLAP";

export type ValidateTiersResult =
  | { ok: true }
  | { ok: false; error: ValidateTiersError; message: string };

/**
 * Enforces the tier-table invariants so no customer ever falls in a gap or
 * matches two tiers: non-empty, numeric, fee >= 0, min < max, first tier starts
 * at 0, and consecutive tiers are contiguous (`prev.maxMiles == next.minMiles`).
 */
export function validateTiers(tiers: TierBounds[]): ValidateTiersResult {
  if (tiers.length === 0) {
    return { ok: false, error: "EMPTY", message: "Define al menos un tramo." };
  }

  for (const tier of tiers) {
    if (
      !Number.isFinite(tier.minMiles) ||
      !Number.isFinite(tier.maxMiles) ||
      !Number.isFinite(tier.fee)
    ) {
      return {
        ok: false,
        error: "NON_NUMERIC",
        message: "Las millas y la tarifa deben ser números válidos.",
      };
    }
    if (tier.fee < 0) {
      return {
        ok: false,
        error: "NEGATIVE_FEE",
        message: "La tarifa no puede ser negativa.",
      };
    }
    if (tier.minMiles >= tier.maxMiles) {
      return {
        ok: false,
        error: "BAD_RANGE",
        message: "El mínimo de millas debe ser menor que el máximo.",
      };
    }
  }

  const sorted = [...tiers].sort(byMinMiles);

  if (Math.abs(sorted[0].minMiles) > EPS) {
    return {
      ok: false,
      error: "FIRST_NOT_ZERO",
      message: "El primer tramo debe empezar en 0 millas.",
    };
  }

  for (let i = 1; i < sorted.length; i += 1) {
    const prev = sorted[i - 1];
    const current = sorted[i];
    const diff = current.minMiles - prev.maxMiles;
    if (diff > EPS) {
      return {
        ok: false,
        error: "GAP",
        message: "Los tramos deben ser contiguos, sin huecos entre ellos.",
      };
    }
    if (diff < -EPS) {
      return {
        ok: false,
        error: "OVERLAP",
        message: "Los tramos no pueden traslaparse.",
      };
    }
  }

  return { ok: true };
}
