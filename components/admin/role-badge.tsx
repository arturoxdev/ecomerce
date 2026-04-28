import type { UserRole } from "@/lib/db/schema";
import { USER_ROLE_LABEL } from "@/lib/admin/labels";
import { cn } from "@/lib/utils";

const config: Record<UserRole, string> = {
  ROOT: "bg-accent text-accent-foreground",
  ADMIN:
    "bg-[rgb(243,232,255)] text-[rgb(126,34,206)] dark:bg-[rgb(126,34,206)]/15 dark:text-[rgb(216,180,254)]",
  EMPLOYEE:
    "bg-[rgb(219,234,254)] text-[rgb(29,78,216)] dark:bg-[rgb(29,78,216)]/15 dark:text-[rgb(147,197,253)]",
};

type Props = {
  role: UserRole;
  className?: string;
};

export function RoleBadge({ role, className }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 font-mono text-[10.5px] font-bold tracking-[0.04em]",
        config[role],
        className,
      )}
    >
      {USER_ROLE_LABEL[role] ?? role}
    </span>
  );
}
