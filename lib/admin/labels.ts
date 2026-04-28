import type {
  DeliveryMode,
  OrderStatus,
  PaymentMethod,
  PaymentMode,
  PaymentStatus,
  PriceType,
  UserRole,
} from "@/lib/db/schema";

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmada",
  DELIVERED: "Entregada",
  RETURNED: "Devuelta",
  CANCELLED: "Cancelada",
};

export const USER_ROLE_LABEL: Record<UserRole, string> = {
  ROOT: "Root",
  ADMIN: "Administrador",
  EMPLOYEE: "Empleado",
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  AUTHORIZED: "Autorizado",
  CAPTURED: "Capturado",
  VOIDED: "Anulado",
  FAILED: "Fallido",
  SUSPICIOUS: "Sospechoso",
};

export const PAYMENT_MODE_LABEL: Record<PaymentMode, string> = {
  SPLIT_50_50: "50% en línea / 50% al entregar",
  FULL_ONLINE: "Pago completo en línea",
};

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  CASH: "Efectivo",
  CARD: "Tarjeta",
  TRANSFER: "Transferencia",
};

export const DELIVERY_MODE_LABEL: Record<DeliveryMode, string> = {
  INCLUDED: "Incluida",
  FIXED_FEE: "Tarifa fija",
  ZIP_CODE: "Por código postal",
};

export const PRICE_TYPE_LABEL: Record<PriceType, string> = {
  FIXED: "Fijo",
  PER_UNIT: "Por unidad",
};

export const PRODUCT_STATUS_LABEL = {
  ACTIVE: "Activo",
  INACTIVE: "Inactivo",
} as const;

export const BLOCK_TYPE_LABEL = {
  MANUAL: "Bloqueo manual",
  RESERVATION: "Reservación",
} as const;
