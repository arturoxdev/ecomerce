"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

import { cancelOrder, markOrderAsPaid } from "@/features/orders/actions";

type Props = {
  orderId: string;
  status: "PENDING" | "CONFIRMED" | "DELIVERED" | "RETURNED" | "CANCELLED";
  paymentStatus:
    | "AUTHORIZED"
    | "CAPTURED"
    | "VOIDED"
    | "FAILED"
    | "SUSPICIOUS";
  paymentMethod: "CASH" | "CARD" | "TRANSFER";
  isStripe: boolean;
  currentRole: "ROOT" | "ADMIN" | "EMPLOYEE";
};

export function OrderDetailActions({
  orderId,
  status,
  paymentStatus,
  paymentMethod,
  isStripe,
  currentRole,
}: Props) {
  const router = useRouter();
  const [markPaidOpen, setMarkPaidOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [chosenMethod, setChosenMethod] = useState<"CASH" | "TRANSFER">("CASH");
  const [isPending, startTransition] = useTransition();

  if (currentRole === "EMPLOYEE") return null;

  const showMarkPaid =
    !isStripe &&
    paymentStatus === "AUTHORIZED" &&
    paymentMethod !== "CARD" &&
    status !== "CANCELLED" &&
    status !== "RETURNED";

  const showCancel =
    status !== "CANCELLED" &&
    status !== "DELIVERED" &&
    status !== "RETURNED";

  const stripeCapturedWarning = isStripe && paymentStatus === "CAPTURED";

  function handleMarkPaid() {
    startTransition(async () => {
      const result = await markOrderAsPaid(orderId, chosenMethod);
      if ("success" in result && result.success) {
        toast.success("Orden marcada como pagada");
        setMarkPaidOpen(false);
        router.refresh();
        return;
      }
      const detail = "detail" in result ? result.detail : undefined;
      toast.error(detail ?? "No se pudo marcar como pagada");
    });
  }

  function handleCancel() {
    startTransition(async () => {
      const result = await cancelOrder(orderId);
      if ("success" in result && result.success) {
        toast.success(
          result.warning === "stripe_captured_no_refund"
            ? "Orden cancelada. Realiza el refund desde Stripe Dashboard."
            : "Orden cancelada",
        );
        setCancelOpen(false);
        router.refresh();
        return;
      }
      const detail = "detail" in result ? result.detail : undefined;
      toast.error(detail ?? "No se pudo cancelar la orden");
    });
  }

  if (!showMarkPaid && !showCancel) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {showMarkPaid && (
        <Button
          type="button"
          variant="default"
          onClick={() => setMarkPaidOpen(true)}
          data-testid="mark-paid-button"
        >
          Marcar como pagada
        </Button>
      )}
      {showCancel && (
        <Button
          type="button"
          variant="destructive"
          onClick={() => setCancelOpen(true)}
          data-testid="cancel-order-button"
        >
          Cancelar
        </Button>
      )}

      <AlertDialog open={markPaidOpen} onOpenChange={setMarkPaidOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Registrar pago final</AlertDialogTitle>
            <AlertDialogDescription>
              Selecciona el método del saldo final. La orden pasará a
              CAPTURED.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-2">
            <Label>Método</Label>
            <RadioGroup
              value={chosenMethod}
              onValueChange={(v) =>
                setChosenMethod(v as "CASH" | "TRANSFER")
              }
              className="flex gap-4"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="CASH" id="paid-cash" />
                <Label htmlFor="paid-cash" className="font-normal">
                  Efectivo
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="TRANSFER" id="paid-transfer" />
                <Label htmlFor="paid-transfer" className="font-normal">
                  Transferencia
                </Label>
              </div>
            </RadioGroup>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleMarkPaid}
              disabled={isPending}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cancelar esta orden?</AlertDialogTitle>
            <AlertDialogDescription>
              Se liberará el inventario reservado.
              {stripeCapturedWarning && (
                <span className="mt-2 block font-medium text-amber-600">
                  El refund se hace desde Stripe Dashboard.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              disabled={isPending}
            >
              Sí, cancelar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
