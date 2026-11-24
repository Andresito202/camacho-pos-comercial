import type { ReactNode } from "react";
import { cn } from "./cn";

export type BadgeTone = "navy" | "yellow" | "teal" | "muted" | "steel" | "danger";

const tones: Record<BadgeTone, string> = {
  navy: "bg-[var(--navy)] text-[var(--ivory)]",
  yellow: "bg-[var(--yellow)] text-[var(--navy)]",
  teal: "bg-[var(--teal)] text-white",
  muted: "bg-[color-mix(in_srgb,var(--muted)_18%,white)] text-[var(--muted)]",
  steel: "bg-[var(--steel)] text-white",
  danger: "bg-[color-mix(in_srgb,var(--danger)_12%,white)] text-[var(--danger)]",
};

export function Badge({
  children,
  tone = "muted",
  className,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold tracking-wide",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
