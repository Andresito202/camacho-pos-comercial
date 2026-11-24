import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";
import { cn } from "./cn";

type Shared = {
  label: string;
  hint?: string;
  error?: string;
  className?: string;
};

export type InputProps = Shared & InputHTMLAttributes<HTMLInputElement>;
export type TextAreaProps = Shared & TextareaHTMLAttributes<HTMLTextAreaElement>;

function FieldShell({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1.5" htmlFor={id}>
      <span className="text-sm font-medium text-[var(--navy)]">{label}</span>
      {children}
      {error ? (
        <span className="block text-sm text-[var(--danger)]" role="alert">
          {error}
        </span>
      ) : hint ? (
        <span className="block text-sm text-[var(--muted)]">{hint}</span>
      ) : null}
    </label>
  );
}

const fieldClass =
  "w-full rounded-md border border-[var(--border)] bg-white px-3 py-2.5 text-[var(--navy)] shadow-sm outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--teal)] focus:ring-[var(--focus-ring)]";

export function Input({ label, hint, error, className, id, ...props }: InputProps) {
  const fieldId = id ?? props.name ?? label.toLowerCase().replace(/\s+/g, "-");
  return (
    <FieldShell id={fieldId} label={label} hint={hint} error={error}>
      <input id={fieldId} className={cn(fieldClass, className)} aria-invalid={Boolean(error)} {...props} />
    </FieldShell>
  );
}

export function TextArea({ label, hint, error, className, id, ...props }: TextAreaProps) {
  const fieldId = id ?? props.name ?? label.toLowerCase().replace(/\s+/g, "-");
  return (
    <FieldShell id={fieldId} label={label} hint={hint} error={error}>
      <textarea
        id={fieldId}
        className={cn(fieldClass, "min-h-28 resize-y", className)}
        aria-invalid={Boolean(error)}
        {...props}
      />
    </FieldShell>
  );
}
