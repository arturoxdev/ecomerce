import { SiteHeader } from "@/components/admin/site-header";
import {
  PaymentsForm,
  getSettings,
  updatePaymentSettingsAction,
} from "@/features/admin-settings";

export default async function AdminPaymentsSettingsPage() {
  const current = await getSettings();

  return (
    <>
      <SiteHeader title="Pagos" />
      <div className="flex flex-1 flex-col gap-6 px-4 py-8">
        <div>
          <h1 className="text-xl font-semibold">Pagos</h1>
          <p className="text-sm text-muted-foreground">
            Configuración de modo de pago y anticipo.
          </p>
        </div>
        <PaymentsForm
          action={updatePaymentSettingsAction}
          defaultValues={{
            paymentMode: current?.paymentMode ?? "SPLIT_50_50",
            depositPercent: current?.depositPercent ?? "0.10",
          }}
        />
      </div>
    </>
  );
}
