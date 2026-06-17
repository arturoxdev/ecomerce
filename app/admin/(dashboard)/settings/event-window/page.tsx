import { ChevronLeft } from "lucide-react";
import Link from "next/link";

import { SiteHeader } from "@/components/admin/site-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSettings, updateEventWindowSettingsAction } from "@/features/admin-settings";
import { EventWindowForm } from "@/features/admin-settings/components/event-window-form";

export default async function AdminEventWindowSettingsPage() {
  const current = await getSettings();

  return (
    <>
      <SiteHeader title="Horario de eventos" />
      <div className="flex flex-1 flex-col gap-6 px-4 py-8">
        <div>
          <Link
            href="/admin/settings"
            className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="size-4" />
            Ajustes
          </Link>
          <h1 className="text-xl font-semibold">Horario de eventos</h1>
          <p className="text-sm text-muted-foreground">
            Define el rango de horas en que aceptas que inicien los eventos.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Rango de horas de inicio</CardTitle>
          </CardHeader>
          <CardContent>
            <EventWindowForm
              action={updateEventWindowSettingsAction}
              defaultValues={{
                eventWindowStart: current?.eventWindowStart ?? null,
                eventWindowEnd: current?.eventWindowEnd ?? null,
              }}
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
