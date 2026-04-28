import { create } from "zustand";
import { persist } from "zustand/middleware";

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
};

type CartStore = {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "id">) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
};

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) => {
        const existing = get().items.find(
          (i) =>
            i.productId === item.productId &&
            i.variantId === item.variantId &&
            i.date === item.date,
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
          set({ items: [...get().items, { ...item, id: crypto.randomUUID() }] });
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
        set({ items: [] });
      },
    }),
    {
      name: "festejos-cart",
      version: 1,
      migrate: () => ({ items: [] }),
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
