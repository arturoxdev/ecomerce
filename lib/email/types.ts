export type NewOrderNotificationPayload = {
  orderNumber: string; // id corto (8 chars)
  adminOrderUrl: string; // URL completa a /admin/orders/{id}
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  deliveryAddress: string | null;
  items: Array<{ name: string; quantity: number; rentDate: string }>; // rentDate ya formateado para mostrar
  currency: string; // código ISO, ej. "USD"
  totalAmount: number;
  paidOnlineAmount: number;
  balanceDueAmount: number;
};
