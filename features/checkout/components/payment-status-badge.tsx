import type { PaymentStatus } from "@/lib/db/schema";

const STYLES: Record<PaymentStatus, { label: string; className: string }> = {
  AUTHORIZED: {
    label: "Pending payment",
    className: "bg-amber-100 text-amber-800",
  },
  CAPTURED: { label: "Paid", className: "bg-green-100 text-green-800" },
  FAILED: { label: "Failed", className: "bg-red-100 text-red-800" },
  VOIDED: { label: "Refunded", className: "bg-slate-200 text-slate-700" },
  SUSPICIOUS: {
    label: "Needs review",
    className: "bg-red-200 text-red-900 font-semibold",
  },
};

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const s = STYLES[status];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs ${s.className}`}
    >
      {s.label}
    </span>
  );
}
