import { ShoppingBag } from "lucide-react";

import { SiteHeader } from "@/components/admin/site-header";

export default function AdminOrdersPage() {
  return (
    <>
      <SiteHeader title="Orders" />
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-24">
        <div className="rounded-full bg-muted p-4">
          <ShoppingBag className="size-8 text-muted-foreground" />
        </div>
        <h2 className="text-lg font-medium">Coming soon</h2>
        <p className="text-sm text-muted-foreground">
          This feature is under development.
        </p>
      </div>
    </>
  );
}
