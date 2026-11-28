"use client";

import { cn } from "./cn";

export function WhatsAppFloat({
  href,
  label = "WhatsApp",
  className,
}: {
  href: string;
  label?: string;
  className?: string;
}) {
  if (!href) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "fixed bottom-5 right-5 z-40 inline-flex min-h-14 items-center gap-2.5 rounded-full bg-[#128C7E] px-4 py-3 text-sm font-bold text-white shadow-[0_12px_28px_rgba(18,140,126,0.45)] ring-2 ring-white/90 transition hover:bg-[#0e7a6d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#128C7E] sm:bottom-6 sm:right-6 sm:min-h-12 sm:px-5",
        className,
      )}
      aria-label={label}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor" className="shrink-0">
        <path d="M20.5 3.5A11 11 0 0 0 3.1 17.3L2 22l4.8-1.1A11 11 0 1 0 20.5 3.5Zm-8.5 17a9 9 0 0 1-4.6-1.3l-.3-.2-2.9.7.7-2.8-.2-.3A9 9 0 1 1 12 20.5Zm5-6.7c-.3-.1-1.6-.8-1.9-.9s-.4-.1-.6.1-.7.9-.8 1-.3.2-.6.1a7.4 7.4 0 0 1-2.2-1.4 8.2 8.2 0 0 1-1.5-1.9c-.2-.3 0-.4.1-.6l.5-.6c.1-.2.1-.3 0-.5l-.9-2.1c-.2-.5-.5-.4-.6-.4h-.5c-.2 0-.5.2-.7.4s-.9.9-.9 2.1.9 2.4 1 2.6a10.6 10.6 0 0 0 4.1 3.7c.6.3 1 .4 1.4.5.6.2 1.1.2 1.5.1.5-.1 1.6-.7 1.8-1.3.2-.6.2-1.2.2-1.3 0-.1-.2-.2-.5-.3Z" />
      </svg>
      <span className="max-w-[9.5rem] truncate sm:max-w-none">{label}</span>
    </a>
  );
}
