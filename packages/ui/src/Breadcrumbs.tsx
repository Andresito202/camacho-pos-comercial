import type { ReactNode } from "react";
import { cn } from "./cn";

export type Crumb = {
  href?: string;
  label: string;
};

export function Breadcrumbs({
  items,
  className,
  linkAs,
}: {
  items: Crumb[];
  className?: string;
  linkAs?: (crumb: Crumb, children: ReactNode) => ReactNode;
}) {
  return (
    <nav aria-label="Migas de pan" className={cn("text-sm text-[var(--muted)]", className)}>
      <ol className="flex flex-wrap items-center gap-2">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const content = isLast || !item.href ? (
            <span aria-current={isLast ? "page" : undefined} className={isLast ? "font-medium text-[var(--navy)]" : undefined}>
              {item.label}
            </span>
          ) : linkAs ? (
            linkAs(item, item.label)
          ) : (
            <a href={item.href} className="underline-offset-2 hover:underline">
              {item.label}
            </a>
          );
          return (
            <li key={`${item.label}-${index}`} className="inline-flex items-center gap-2">
              {index > 0 ? <span aria-hidden>/</span> : null}
              {content}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
