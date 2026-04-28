import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

type Props = {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
};

export function SiteHeader({ title, subtitle, actions }: Props) {
  return (
    <header className="flex min-h-(--header-height) shrink-0 items-center gap-3 border-b border-border bg-background px-7 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <SidebarTrigger className="-ml-1" />
      <Separator
        orientation="vertical"
        className="data-[orientation=vertical]:h-4"
      />
      <div className="flex min-w-0 flex-1 items-baseline gap-3">
        {typeof title === "string" ? (
          <h1 className="truncate text-[22px] font-bold tracking-tight text-foreground">
            {title}
          </h1>
        ) : (
          <div className="flex min-w-0 items-baseline gap-3 text-[13px]">
            {title}
          </div>
        )}
        {subtitle && (
          <span className="truncate text-[12.5px] text-muted-foreground">
            {subtitle}
          </span>
        )}
      </div>
      {actions && (
        <div className="ml-auto flex items-center gap-2">{actions}</div>
      )}
    </header>
  );
}
