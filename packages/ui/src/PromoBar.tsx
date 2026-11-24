import type { ReactNode } from "react";
import { cn } from "./cn";

export function PromoBar({
  message,
  href,
  cta,
  className,
  linkAs,
}: {
  message: string;
  href?: string;
  cta?: string;
  className?: string;
  linkAs?: (href: string, children: ReactNode) => ReactNode;
}) {
  if (!message) return null;

  const action =
    href && cta
      ? linkAs
        ? linkAs(href, cta)
        : (
            <a href={href} className="font-semibold underline underline-offset-2">
              {cta}
            </a>
          )
      : null;

  return (
    <div
      className={cn(
        "bg-[var(--navy)] px-4 py-2 text-center text-sm text-[var(--ivory)]",
        className,
      )}
      role="region"
      aria-label="Promoción"
    >
      <p className="inline-flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
        <span>{message}</span>
        {action}
      </p>
    </div>
  );
}
