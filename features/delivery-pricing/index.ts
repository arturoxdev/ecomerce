// Actions ("use server" — safe to import from client components)
export {
  createTier,
  updateTier,
  deleteTier,
  updateOrigin,
  type DeliveryPricingFormState,
} from "./actions";

// Components (admin)
export { OriginForm } from "./components/origin-form";
export { TierForm } from "./components/tier-form";
export { TierList } from "./components/tier-list";

// Types
export type { DistanceTier } from "./services/distance-pricing.service";

// NOTE: server-only modules (`./data`, `./services/quote.service`) are NOT
// re-exported here so this barrel stays safe to import from client components.
// Server code deep-imports them directly.
