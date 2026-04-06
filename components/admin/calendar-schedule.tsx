"use client";

import { useEffect, useState, useTransition } from "react";
import { format } from "date-fns";
import { CalendarDays, Truck, RotateCcw } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
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
import {
  getScheduleForDate,
  type ScheduleEntry,
} from "@/app/admin/(dashboard)/calendar/actions";

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
            Select Date
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
          {entries.length} {entries.length === 1 ? "entry" : "entries"}
          {isPending && " ..."}
        </p>
      </div>

      {/* Schedule table */}
      {entries.length === 0 && !isPending ? (
        <div className="flex flex-col items-center justify-center gap-2 py-16">
          <CalendarDays className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            No deliveries or pickups for this date.
          </p>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Type</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Address</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry, idx) => (
                  <TableRow key={`${entry.orderId}-${entry.type}-${idx}`}>
                    <TableCell>
                      {entry.type === "delivery" ? (
                        <Badge className="gap-1 bg-green-100 text-green-800 hover:bg-green-100">
                          <Truck className="size-3" />
                          Entrega
                        </Badge>
                      ) : (
                        <Badge className="gap-1 bg-orange-100 text-orange-800 hover:bg-orange-100">
                          <RotateCcw className="size-3" />
                          Recolección
                        </Badge>
                      )}
                    </TableCell>
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
                      {format(new Date(entry.rentStartDate), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {format(new Date(entry.rentEndDate), "MMM d, yyyy")}
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
