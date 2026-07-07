"use client";

import { Download } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";

type Props = {
  orderId: string;
};

export function DownloadTicketButton({ orderId }: Props) {
  return (
    <a
      href={`/api/admin/orders/${orderId}/ticket`}
      download={`${orderId}.pdf`}
      className={buttonVariants({ variant: "outline", size: "sm" })}
    >
      <Download className="size-3.5" />
      Descargar ticket
    </a>
  );
}
