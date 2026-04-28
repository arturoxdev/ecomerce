import { cn } from "@/lib/utils";

const palette = [
  "bg-secondary text-secondary-foreground",
  "bg-[rgb(126,34,206)] text-white",
  "bg-[rgb(29,78,216)] text-white",
  "bg-success text-success-foreground",
  "bg-[rgb(219,39,119)] text-white",
];

function hash(input: string) {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = ((h << 5) - h + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

type Props = {
  name: string;
  /** When set, picks a stable color from the palette via hashing. Defaults to `name`. */
  seed?: string;
  size?: number;
  className?: string;
};

export function AvatarInitials({ name, seed, size = 30, className }: Props) {
  const initials =
    name
      .split(/\s+/)
      .map((s) => s[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";
  const tone = palette[hash(seed ?? name) % palette.length];
  return (
    <div
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center rounded-full text-[11.5px] font-bold tracking-[0.02em]",
        tone,
        className,
      )}
      style={{ width: size, height: size }}
    >
      {initials}
    </div>
  );
}
