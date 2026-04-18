export type CartStoreSettings = {
  deliveryMode: string;
  deliveryFee: number;
  depositPercent: number;
};

export type CartSummaryInput = {
  subtotal: number;
  settings: CartStoreSettings;
};

export function calculateCartSummary(input: CartSummaryInput) {
  const deliveryFee =
    input.settings.deliveryMode === "INCLUDED" ? 0 : input.settings.deliveryFee;
  const deposit = input.subtotal * input.settings.depositPercent;
  const total = input.subtotal + deliveryFee;

  return {
    deliveryFee,
    deposit,
    total,
  };
}
