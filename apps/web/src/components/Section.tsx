import type { ReactNode } from "react";
import { cn } from "@camacho-pos/ui";

export function Section({
  id,
  eyebrow,
  title,
  lead,
  children,
  className,
  tone = "default",
}: {
  id?: string;
  eyebrow?: string;
  title: string;
  lead?: string;
  children: ReactNode;
  className?: string;
  tone?: "default" | "navy" | "teal";
}) {
  const tones = {
    default: "text-[var(--navy)]",
    navy: "bg-[var(--navy)] text-[var(--ivory)]",
    teal: "bg-[color-mix(in_srgb,var(--teal)_10%,var(--ivory))] text-[var(--navy)]",
  };

  return (
    <section id={id} className={cn("px-4 py-16 sm:px-6 lg:px-8", tones[tone], className)}>
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 max-w-3xl">
          {eyebrow ? (
            <p
              className={cn(
                "mb-3 text-xs font-semibold uppercase tracking-[0.18em]",
                tone === "navy" ? "text-[var(--teal-on-dark)]" : "text-[var(--teal)]",
              )}
            >
              {eyebrow}
            </p>
          ) : null}
          <h2 className="font-serif text-3xl leading-tight sm:text-4xl">{title}</h2>
          {lead ? <p className="mt-4 text-lg text-[color-mix(in_srgb,currentColor_72%,transparent)]">{lead}</p> : null}
        </div>
        {children}
      </div>
    </section>
  );
}
