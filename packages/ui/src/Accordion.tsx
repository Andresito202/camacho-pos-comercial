"use client";

import { useId, useState, type ReactNode } from "react";
import { cn } from "./cn";

export type AccordionItem = {
  id: string;
  title: string;
  content: ReactNode;
};

export function Accordion({
  items,
  className,
  allowMultiple = false,
}: {
  items: AccordionItem[];
  className?: string;
  allowMultiple?: boolean;
}) {
  const baseId = useId();
  const [open, setOpen] = useState<string[]>([]);

  const toggle = (id: string) => {
    setOpen((current) => {
      const isOpen = current.includes(id);
      if (allowMultiple) {
        return isOpen ? current.filter((item) => item !== id) : [...current, id];
      }
      return isOpen ? [] : [id];
    });
  };

  return (
    <div className={cn("divide-y divide-[var(--border)] border-y border-[var(--border)]", className)}>
      {items.map((item) => {
        const isOpen = open.includes(item.id);
        const panelId = `${baseId}-${item.id}-panel`;
        const buttonId = `${baseId}-${item.id}-button`;
        return (
          <div key={item.id}>
            <h3>
              <button
                id={buttonId}
                type="button"
                className="flex w-full items-center justify-between gap-4 py-4 text-left font-medium text-[var(--navy)]"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggle(item.id)}
              >
                <span>{item.title}</span>
                <span aria-hidden className="text-lg text-[var(--teal)]">
                  {isOpen ? "−" : "+"}
                </span>
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              hidden={!isOpen}
              className="pb-4 text-[var(--muted)]"
            >
              {item.content}
            </div>
          </div>
        );
      })}
    </div>
  );
}
