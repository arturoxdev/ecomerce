"use client";

import { useEffect, useState, useTransition } from "react";
import { CalendarDays } from "lucide-react";
import Link from "next/link";

import { formatAdminDate } from "@/lib/admin/format";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getScheduleForDate } from "../../actions";
import type { ScheduleEntry } from "../../services/schedule.service";

function todayString() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function CalendarSchedule() {
  const [selectedDate, setSelectedDate] = useState(todayString());
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const data = await getScheduleForDate(selectedDate);
      setEntries(data);
    });
  }, [selectedDate]);

  return (
    <div className="space-y-4">
      {/* Date picker */}
      <div className="flex items-end gap-4">
        <div>
          <Label htmlFor="schedule-date" className="mb-1.5 block text-sm">
            Selecciona fecha
          </Label>
          <Input
            id="schedule-date"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-48"
          />
        </div>
        <p className="pb-2 text-sm text-muted-foreground">
          {entries.length} {entries.length === 1 ? "registro" : "registros"}
          {isPending && " ..."}
        </p>
      </div>

      {entries.length === 0 && !isPending ? (
        <div className="flex flex-col items-center justify-center gap-2 py-16">
          <CalendarDays className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            No hay reservaciones para esta fecha.
          </p>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Orden</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Artículos</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Hora</TableHead>
                  <TableHead>Dirección</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.orderId}>
                    <TableCell>
                      <Link
                        href={`/admin/orders/${entry.orderId}`}
                        className="font-mono text-xs font-medium text-primary hover:underline"
                      >
                        {entry.orderId.slice(0, 8).toUpperCase()}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      {entry.customerName}
                    </TableCell>
                    <TableCell className="text-sm">
                      {entry.customerPhone}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm">
                      {entry.itemsSummary}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatAdminDate(entry.rentDate)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {entry.eventStartTime ?? "—"}
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate text-xs text-muted-foreground">
                      {entry.deliveryAddress || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
