"use client";

import { format } from "date-fns";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Order = {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  total: string;
  status: string;
  createdAt: Date;
  orderItems: { id: string }[];
};

type Props = {
  orders: Order[];
  total: number;
  page: number;
  pageSize: number;
};

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  CONFIRMED: "bg-green-100 text-green-800",
  DELIVERED: "bg-blue-100 text-blue-800",
  RETURNED: "bg-slate-100 text-slate-800",
  CANCELLED: "bg-red-100 text-red-800",
};

export function OrderTable({ orders, total, page, pageSize }: Props) {
  const totalPages = Math.ceil(total / pageSize);

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16">
        <p className="text-sm text-muted-foreground">No orders yet.</p>
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow
                key={order.id}
                data-testid="admin-order-row"
                data-order-id={order.id}
              >
                <TableCell>
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="font-mono text-xs font-medium text-primary hover:underline"
                  >
                    {order.id.slice(0, 8).toUpperCase()}
                  </Link>
                </TableCell>
                <TableCell>
                  <div>
                    <p className="text-sm font-medium">{order.customerName}</p>
                    <p className="text-xs text-muted-foreground">
                      {order.customerEmail}
                    </p>
                  </div>
                </TableCell>
                <TableCell className="text-sm">{order.customerPhone}</TableCell>
                <TableCell className="text-sm">
                  {order.orderItems.length}
                </TableCell>
                <TableCell className="text-sm font-medium">
                  ${parseFloat(order.total).toFixed(2)}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="secondary"
                    className={statusColors[order.status] ?? ""}
                  >
                    {order.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {format(new Date(order.createdAt), "MMM d, yyyy HH:mm")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {totalPages > 1 && (
          <div className="border-t px-4 py-3">
            <Pagination>
              <PaginationContent>
                {page > 1 && (
                  <PaginationItem>
                    <PaginationPrevious href={`/admin/orders?page=${page - 1}`} />
                  </PaginationItem>
                )}
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (p) => (
                    <PaginationItem key={p}>
                      <PaginationLink
                        href={`/admin/orders?page=${p}`}
                        isActive={p === page}
                      >
                        {p}
                      </PaginationLink>
                    </PaginationItem>
                  ),
                )}
                {page < totalPages && (
                  <PaginationItem>
                    <PaginationNext href={`/admin/orders?page=${page + 1}`} />
                  </PaginationItem>
                )}
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
