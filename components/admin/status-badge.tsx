import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type StatusBadgeState =
  | "active"
  | "inactive"
  | "out-of-stock"
  | "low-stock";

type Props = {
  state: StatusBadgeState;
  label?: string;
  className?: string;
};

const config: Record<
  StatusBadgeState,
  { variant: "success" | "warning" | "outline"; label: string }
> = {
  active: { variant: "success", label: "Active" },
  inactive: { variant: "outline", label: "Inactive" },
  "out-of-stock": { variant: "warning", label: "Out of stock" },
  "low-stock": { variant: "warning", label: "Low stock" },
};

export function StatusBadge({ state, label, className }: Props) {
  const { variant, label: defaultLabel } = config[state];
  return (
    <Badge variant={variant} className={cn("gap-[5px]", className)}>
      <span
        aria-hidden
        className="size-[5px] shrink-0 rounded-full bg-current"
      />
      {label ?? defaultLabel}
    </Badge>
  );
}
