import { cn } from "@/lib/utils";

type Props = {
  value: number | string;
  className?: string;
};

export function CountPill({ value, className }: Props) {
  return (
    <span
      className={cn(
        "inline-flex h-[22px] min-w-6 items-center justify-center rounded-full bg-accent px-1.5 font-mono text-[11.5px] font-bold text-accent-foreground",
        className,
      )}
    >
      {value}
    </span>
  );
}
