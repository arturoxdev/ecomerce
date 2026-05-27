import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartItemService = {
  id: string;
  name: string;
  price: number;
};

export type CartItem = {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  productPhoto: string | null;
  variantId: string | null;
  variantName: string | null;
  quantity: number;
  unitPrice: number;
  priceType: "FIXED" | "PER_UNIT";
  date: string; // "YYYY-MM-DD"
  stock: number;
  // Selected Local Services snapshot (ADR-009). Display + line identity only;
  // prices are always re-derived server-side at checkout, never trusted here.
  selectedServices: CartItemService[];
};

// Order-independent comparison of two selected-service id sets. Two lines only
// merge when they carry the exact same set of local service ids.
function sameServiceIds(
  a: CartItemService[],
  b: CartItemService[],
): boolean {
  if (a.length !== b.length) return false;
  const setB = new Set(b.map((s) => s.id));
  return a.every((s) => setB.has(s.id));
}

export type DeliveryZone = {
  city: string;
  zipCode: string;
};

type CartStore = {
  items: CartItem[];
  selectedZone: DeliveryZone | null;
  addItem: (item: Omit<CartItem, "id">) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  setSelectedZone: (zone: DeliveryZone | null) => void;
};

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      selectedZone: null,

      addItem: (item) => {
        const incomingServices = item.selectedServices ?? [];
        const existing = get().items.find(
          (i) =>
            i.productId === item.productId &&
            i.variantId === item.variantId &&
            i.date === item.date &&
            sameServiceIds(i.selectedServices, incomingServices),
        );

        if (existing && item.priceType === "PER_UNIT") {
          set({
            items: get().items.map((i) =>
              i.id === existing.id
                ? { ...i, quantity: Math.min(i.quantity + item.quantity, i.stock) }
                : i,
            ),
          });
        } else if (!existing) {
          set({
            items: [
              ...get().items,
              {
                ...item,
                selectedServices: incomingServices,
                id: crypto.randomUUID(),
              },
            ],
          });
        }
      },

      removeItem: (id) => {
        set({ items: get().items.filter((i) => i.id !== id) });
      },

      updateQuantity: (id, quantity) => {
        set({
          items: get().items.map((i) =>
            i.id === id ? { ...i, quantity: Math.max(1, Math.min(quantity, i.stock)) } : i,
          ),
        });
      },

      clearCart: () => {
        set({ items: [], selectedZone: null });
      },

      setSelectedZone: (zone) => {
        set({ selectedZone: zone });
      },
    }),
    {
      name: "festejos-cart",
      version: 4,
      migrate: (persisted, version) => {
        const base = (persisted ?? {}) as Partial<CartStore>;
        // Default selectedServices on any pre-v4 persisted line so old carts
        // (added before ADR-009) don't crash the merge/identity logic.
        const items = (base.items ?? []).map((item) => ({
          ...item,
          selectedServices: item.selectedServices ?? [],
        }));
        if (version < 3) {
          return { items, selectedZone: null };
        }
        return {
          items,
          selectedZone: base.selectedZone ?? null,
        };
      },
    },
  ),
);

export function getCartSubtotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
}

export function getItemCount(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

export function isCartItemPastDue(item: CartItem, now: Date = new Date()): boolean {
  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const itemDate = new Date(`${item.date}T00:00:00.000Z`);
  return itemDate < today;
}
