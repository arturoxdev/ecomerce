"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

import { CreateOrderSheet } from "./create-order-sheet";

type Props = {
  currentRole: "ROOT" | "ADMIN" | "EMPLOYEE";
};

export function CreateOrderButton({ currentRole }: Props) {
  const [open, setOpen] = useState(false);

  if (currentRole === "EMPLOYEE") return null;

  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-2">
        <Plus className="size-4" />
        Crear orden
      </Button>
      <CreateOrderSheet open={open} onOpenChange={setOpen} />
    </>
  );
}
