"use client";

import { useReducer, useState, useTransition } from "react";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import { createManualOrder } from "@/app/admin/(dashboard)/orders/actions";
import type { ProductSearchSuggestion } from "@/features/products/actions";

import { AddItemDialog } from "./add-item-dialog";
import { CustomerForm, type CustomerFormValue } from "./customer-form";
import { ItemCard, type DraftItem } from "./item-card";
import { PaymentBox, type PaymentValue } from "./payment-box";
import { ProductSearchInput } from "./product-search-input";
import { Summary } from "./summary";

type DraftState = {
  items: DraftItem[];
  customer: CustomerFormValue;
  payment: PaymentValue;
};

type DraftAction =
  | { type: "ADD_ITEM"; payload: DraftItem }
  | { type: "REMOVE_ITEM"; payload: string }
  | { type: "SET_CUSTOMER"; payload: CustomerFormValue }
  | { type: "SET_PAYMENT"; payload: PaymentValue }
  | { type: "RESET" };

const initialState: DraftState = {
  items: [],
  customer: {
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    deliveryAddress: "",
  },
  payment: { paymentMethod: "CASH", amountPaid: 0 },
};

function reducer(state: DraftState, action: DraftAction): DraftState {
  switch (action.type) {
    case "ADD_ITEM":
      return { ...state, items: [...state.items, action.payload] };
    case "REMOVE_ITEM":
      return {
        ...state,
        items: state.items.filter((i) => i.draftId !== action.payload),
      };
    case "SET_CUSTOMER":
      return { ...state, customer: action.payload };
    case "SET_PAYMENT":
      return { ...state, payment: action.payload };
    case "RESET":
      return initialState;
  }
}

function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function isValidEmail(value: string): boolean {
  return /^\S+@\S+\.\S+$/.test(value);
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CreateOrderSheet({ open, onOpenChange }: Props) {
  const router = useRouter();
  const [state, dispatch] = useReducer(reducer, initialState);
  const [pickedProduct, setPickedProduct] = useState<
    ProductSearchSuggestion | null
  >(null);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const total = state.items.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0,
  );
  const overpaid = state.payment.amountPaid > total;
  const emailInvalid =
    state.customer.customerEmail.length > 0 &&
    !isValidEmail(state.customer.customerEmail);

  const canConfirm =
    state.items.length > 0 &&
    state.customer.customerName.trim().length > 0 &&
    isValidEmail(state.customer.customerEmail) &&
    state.customer.customerPhone.trim().length > 0 &&
    !overpaid &&
    !isPending;

  function handleClose(nextOpen: boolean) {
    if (!nextOpen && state.items.length > 0) {
      setDiscardOpen(true);
      return;
    }
    if (!nextOpen) dispatch({ type: "RESET" });
    onOpenChange(nextOpen);
  }

  function confirmDiscard() {
    setDiscardOpen(false);
    dispatch({ type: "RESET" });
    onOpenChange(false);
  }

  function handleSubmit() {
    if (!canConfirm) return;
    startTransition(async () => {
      const result = await createManualOrder({
        customerName: state.customer.customerName.trim(),
        customerEmail: state.customer.customerEmail.trim(),
        customerPhone: state.customer.customerPhone.trim(),
        deliveryAddress: state.customer.deliveryAddress.trim(),
        items: state.items.map((i) => ({
          productId: i.productId,
          variantId: i.variantId,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          date: toDateString(i.date),
        })),
        amountPaid: state.payment.amountPaid,
        paymentMethod: state.payment.paymentMethod,
      });

      if ("success" in result && result.success) {
        toast.success("Orden creada");
        dispatch({ type: "RESET" });
        onOpenChange(false);
        router.push(`/admin/orders/${result.orderId}`);
        router.refresh();
        return;
      }

      const detail = "detail" in result ? result.detail : "Error desconocido";
      toast.error(detail ?? "No se pudo crear la orden");
    });
  }

  return (
    <>
      <Sheet open={open} onOpenChange={handleClose}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-4 overflow-y-auto sm:max-w-2xl"
        >
          <SheetHeader>
            <SheetTitle>Crear orden manual</SheetTitle>
            <SheetDescription>
              Registra una reserva pagada fuera del sistema.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 px-4 pb-4">
            <ProductSearchInput onPick={(p) => setPickedProduct(p)} />

            {state.items.length > 0 ? (
              <div className="space-y-2">
                {state.items.map((item) => (
                  <ItemCard
                    key={item.draftId}
                    item={item}
                    onRemove={(id) =>
                      dispatch({ type: "REMOVE_ITEM", payload: id })
                    }
                  />
                ))}
              </div>
            ) : (
              <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
                Agrega al menos un producto para continuar.
              </p>
            )}

            <CustomerForm
              value={state.customer}
              onChange={(c) => dispatch({ type: "SET_CUSTOMER", payload: c })}
            />
            {emailInvalid && (
              <p className="text-xs text-red-600">
                El correo no es válido.
              </p>
            )}

            <PaymentBox
              value={state.payment}
              total={total}
              onChange={(p) => dispatch({ type: "SET_PAYMENT", payload: p })}
            />

            <Summary
              items={state.items}
              amountPaid={state.payment.amountPaid}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                type="button"
                onClick={() => handleClose(false)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={!canConfirm}
                data-testid="confirm-manual-order"
              >
                {isPending ? "Creando…" : "Confirmar orden"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <AddItemDialog
        key={pickedProduct?.id ?? "none"}
        product={pickedProduct}
        open={Boolean(pickedProduct)}
        onOpenChange={(o) => {
          if (!o) setPickedProduct(null);
        }}
        onConfirm={(item) => dispatch({ type: "ADD_ITEM", payload: item })}
      />

      <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Descartar orden?</AlertDialogTitle>
            <AlertDialogDescription>
              Tienes {state.items.length} ítem
              {state.items.length === 1 ? "" : "s"} sin guardar. Si cierras se
              perderá el borrador.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar editando</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDiscard}>
              Descartar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
