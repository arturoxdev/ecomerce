import { sql } from "drizzle-orm";

export type AvailabilityWindowInput = {
  productId: string;
  date: Date;
  variantId?: string | null;
};

export type AvailabilityCheckInput = AvailabilityWindowInput & {
  quantity: number;
  stock: number;
};

type OccupiedRow = { occupied: number | string | bigint | null };
type AvailabilityExecutor = {
  execute(query: ReturnType<typeof sql>): Promise<{ rows: OccupiedRow[] }>;
};

export async function findOccupiedQuantity(
  executor: AvailabilityExecutor,
  input: AvailabilityWindowInput,
): Promise<number> {
  const result = input.variantId
    ? await executor.execute(sql`
        SELECT COALESCE(SUM(quantity), 0)::int AS occupied
        FROM availability
        WHERE product_id = ${input.productId}::uuid
          AND variant_id = ${input.variantId}::uuid
          AND date = ${input.date}::timestamp
      `)
    : await executor.execute(sql`
        SELECT COALESCE(SUM(quantity), 0)::int AS occupied
        FROM availability
        WHERE product_id = ${input.productId}::uuid
          AND variant_id IS NULL
          AND date = ${input.date}::timestamp
      `);

  return Number(result.rows[0]?.occupied ?? 0);
}

export async function checkAvailability(
  executor: AvailabilityExecutor,
  input: AvailabilityCheckInput,
) {
  const occupied = await findOccupiedQuantity(executor, input);

  return {
    occupied,
    isAvailable: occupied + input.quantity <= input.stock,
  };
}

export function calculateAvailableQuantity(input: {
  occupied: number;
  stock: number;
  priceType: "FIXED" | "PER_UNIT";
}): number {
  if (input.priceType === "FIXED") {
    return input.occupied >= 1 ? 0 : 1;
  }

  return Math.max(0, input.stock - input.occupied);
}
