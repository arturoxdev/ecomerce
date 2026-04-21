import { SiteHeader } from "@/components/admin/site-header";
import {
  SettingsForm,
  getSettings,
  updateSettingsAction,
} from "@/features/admin-settings";

export default async function AdminPaymentsSettingsPage() {
  const current = await getSettings();

  return (
    <>
      <SiteHeader title="Payments & delivery" />
      <div className="flex flex-1 flex-col gap-6 px-4 py-8">
        <div>
          <h1 className="text-xl font-semibold">Payments & delivery</h1>
          <p className="text-sm text-muted-foreground">
            Payment mode, delivery, and deposit configuration.
          </p>
        </div>
        <SettingsForm
          action={updateSettingsAction}
          defaultValues={{
            paymentMode: current?.paymentMode ?? "SPLIT_50_50",
            deliveryMode:
              current?.deliveryMode === "FIXED_FEE" ? "FIXED_FEE" : "INCLUDED",
            deliveryFee: current?.deliveryFee ?? null,
            depositPercent: current?.depositPercent ?? "0.10",
          }}
        />
      </div>
    </>
  );
}
