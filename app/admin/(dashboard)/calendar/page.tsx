import { SiteHeader } from "@/components/admin/site-header";
import { CalendarSchedule } from "@/features/orders";

export default function AdminCalendarPage() {
  return (
    <>
      <SiteHeader title="Calendario de entregas" />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <CalendarSchedule />
      </div>
    </>
  );
}
