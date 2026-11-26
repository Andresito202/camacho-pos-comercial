"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { Button } from "./Button";
import { cn } from "./cn";

export type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
  footer?: ReactNode;
};

export function Modal({ open, onClose, title, children, className, footer }: ModalProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <dialog
      ref={dialogRef}
      className={cn(
        "fixed left-1/2 top-1/2 z-50 m-0 max-h-[min(92vh,52rem)] w-[min(94vw,42rem)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-0 text-[var(--navy)] shadow-[var(--shadow-soft)] open:flex open:flex-col backdrop:bg-[color-mix(in_srgb,var(--navy)_60%,transparent)]",
        className,
      )}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
    >
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--border)] px-4 py-3 sm:px-5 sm:py-4">
        <h2 id={titleId} className="min-w-0 flex-1 text-lg font-bold leading-snug sm:text-xl">
          {title}
        </h2>
        <Button variant="ghost" size="sm" className="shrink-0" aria-label="Cerrar" onClick={onClose}>
          ✕
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">{children}</div>
      {footer ? (
        <div className="shrink-0 border-t border-[var(--border)] bg-[var(--ivory)] px-4 py-3 sm:px-5 sm:py-4">
          {footer}
        </div>
      ) : null}
    </dialog>
  );
}
