import { ChevronLeft } from "lucide-react";
import Link from "next/link";

import { SiteHeader } from "@/components/admin/site-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ServiceList } from "@/features/admin-global-services";
import { findServicesByStore } from "@/features/admin-global-services/data";
import { getStoreId } from "@/lib/config/tenant";
import { canWriteData, getSessionUser } from "@/lib/services/auth";

export default async function AdminAdditionalServicesPage() {
  const storeId = getStoreId();
  const [user, services] = await Promise.all([
    getSessionUser(),
    findServicesByStore(storeId),
  ]);

  const canWrite = canWriteData(user.role);

  return (
    <>
      <SiteHeader title="Servicios adicionales" />
      <div className="flex flex-1 flex-col gap-6 px-4 py-8">
        <div>
          <Link
            href="/admin/settings"
            className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="size-4" />
            Ajustes
          </Link>
          <h1 className="text-xl font-semibold">Servicios adicionales</h1>
          <p className="text-sm text-muted-foreground">
            Servicios opcionales que aplican a toda la orden y se eligen en el
            checkout (ej. recoger al día siguiente).
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Servicios adicionales globales</CardTitle>
          </CardHeader>
          <CardContent>
            <ServiceList services={services} canWrite={canWrite} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
