import type { PaymentMode } from "@/lib/db/schema";

type Props = {
  total: string;
  amountPaid: string;
  paymentMode: PaymentMode;
};

export function PaymentBreakdown({ total, amountPaid, paymentMode }: Props) {
  const totalNum = parseFloat(total);
  const paidNum = parseFloat(amountPaid);
  const balance = Math.max(0, totalNum - paidNum);

  if (paymentMode === "FULL_ONLINE") {
    return (
      <div className="text-sm text-slate-700">
        Paid online: <span className="font-medium">${paidNum.toFixed(2)}</span>
      </div>
    );
  }

  return (
    <div className="space-y-1 text-sm text-slate-700">
      <div>
        Paid online: <span className="font-medium">${paidNum.toFixed(2)}</span>
      </div>
      <div>
        Balance on delivery:{" "}
        <span className="font-medium">${balance.toFixed(2)}</span>
      </div>
    </div>
  );
}
