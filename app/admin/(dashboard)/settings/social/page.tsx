import { ChevronLeft } from "lucide-react";
import Link from "next/link";

import { SiteHeader } from "@/components/admin/site-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getSettings,
  SocialLinksForm,
  updateSocialLinksSettingsAction,
} from "@/features/admin-settings";

export default async function AdminSocialLinksSettingsPage() {
  const current = await getSettings();

  return (
    <>
      <SiteHeader title="Redes sociales" />
      <div className="flex flex-1 flex-col gap-6 px-4 py-8">
        <div>
          <Link
            href="/admin/settings"
            className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="size-4" />
            Ajustes
          </Link>
          <h1 className="text-xl font-semibold">Redes sociales</h1>
          <p className="text-sm text-muted-foreground">
            Enlaces de Facebook e Instagram que aparecen en el footer del sitio.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Enlaces</CardTitle>
          </CardHeader>
          <CardContent>
            <SocialLinksForm
              action={updateSocialLinksSettingsAction}
              defaultValues={{
                facebookUrl: current?.facebookUrl ?? null,
                instagramUrl: current?.instagramUrl ?? null,
              }}
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
