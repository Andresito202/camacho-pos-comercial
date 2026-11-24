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
        "fixed inset-0 z-50 m-auto w-[min(94vw,42rem)] max-h-[min(92vh,52rem)] overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--ivory)] p-0 text-[var(--navy)] shadow-2xl open:flex open:flex-col backdrop:bg-[color-mix(in_srgb,var(--navy)_55%,transparent)]",
        className,
      )}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
    >
      <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] px-5 py-4">
        <h2 id={titleId} className="font-serif text-xl font-semibold">
          {title}
        </h2>
        <Button variant="ghost" size="sm" aria-label="Cerrar" onClick={onClose}>
          ✕
        </Button>
      </div>
      <div className="px-5 py-4">{children}</div>
      {footer ? <div className="border-t border-[var(--border)] px-5 py-4">{footer}</div> : null}
    </dialog>
  );
}
