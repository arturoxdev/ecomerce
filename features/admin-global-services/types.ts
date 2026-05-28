/**
 * A store-wide additional service ("Servicio adicional global"). Additive,
 * multi-selectable at checkout, applies once per order. See ADR-009.
 */
export type GlobalService = {
  id: string;
  name: string;
  price: number;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
};
