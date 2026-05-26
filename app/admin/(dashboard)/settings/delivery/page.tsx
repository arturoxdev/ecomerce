import Link from "next/link";

import { SiteHeader } from "@/components/admin/site-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DeliveryModeForm,
  getSettings,
  updateDeliverySettingsAction,
} from "@/features/admin-settings";
import { OriginForm, TierList, updateOrigin } from "@/features/delivery-pricing";
import { findTiersByStore, getOrigin } from "@/features/delivery-pricing/data";
import { countZipcodes } from "@/features/zipcodes/services/zipcodes.service";
import { getStoreId } from "@/lib/config/tenant";
import { canWriteData, getSessionUser } from "@/lib/services/auth";

export default async function AdminDeliverySettingsPage() {
  const storeId = getStoreId();
  const [user, current, origin, tiers, zipcodeCount] = await Promise.all([
    getSessionUser(),
    getSettings(),
    getOrigin(storeId),
    findTiersByStore(storeId),
    countZipcodes(),
  ]);

  const canWrite = canWriteData(user.role);
  const hasOrigin = origin.lat !== null && origin.lng !== null;

  return (
    <>
      <SiteHeader title="Entrega" />
      <div className="flex flex-1 flex-col gap-6 px-4 py-8">
        <div>
          <h1 className="text-xl font-semibold">Entrega</h1>
          <p className="text-sm text-muted-foreground">
            Modo de entrega, origen de operaciones y tramos por distancia.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Modo de entrega</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <DeliveryModeForm
              action={updateDeliverySettingsAction}
              defaultValues={{
                deliveryMode: current?.deliveryMode ?? "INCLUDED",
                deliveryFee: current?.deliveryFee ?? null,
              }}
              hasZipcodes={zipcodeCount > 0}
              hasOrigin={hasOrigin}
              hasTiers={tiers.length > 0}
            />
            <p className="text-sm text-muted-foreground">
              ¿Entregas por código postal? Administra tu catálogo en{" "}
              <Link
                href="/admin/settings/delivery/zipcodes"
                className="font-medium underline underline-offset-2 hover:text-foreground"
              >
                Códigos postales
              </Link>
              .
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Origen de operaciones</CardTitle>
          </CardHeader>
          <CardContent>
            <OriginForm
              action={updateOrigin}
              defaultValues={{
                address: origin.address ?? "",
                lat: origin.lat,
                lng: origin.lng,
              }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tramos por distancia</CardTitle>
          </CardHeader>
          <CardContent>
            <TierList tiers={tiers} canWrite={canWrite} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
