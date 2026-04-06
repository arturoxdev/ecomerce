import { SiteHeader } from "@/components/admin/site-header";
import { CalendarSchedule } from "@/components/admin/calendar-schedule";

export default function AdminCalendarPage() {
  return (
    <>
      <SiteHeader title="Delivery Schedule" />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <CalendarSchedule />
      </div>
    </>
  );
}
