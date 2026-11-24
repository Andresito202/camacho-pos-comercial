"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@camacho-pos/ui";
import { adminMutate } from "@/lib/api";

type Field = {
  name: string;
  label: string;
  type?: "text" | "number" | "textarea" | "checkbox" | "select";
  defaultValue?: string | number | boolean;
  options?: Array<{ value: string; label: string }>;
  required?: boolean;
};

export function AdminActionForm({
  title,
  path,
  method = "PATCH",
  fields,
  token,
  submitLabel = "Guardar",
  onSuccess,
}: {
  title: string;
  path: string;
  method?: "POST" | "PATCH" | "DELETE";
  fields?: Field[];
  token?: string;
  submitLabel?: string;
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    const form = new FormData(event.currentTarget);
    const body: Record<string, unknown> = {};
    for (const field of fields ?? []) {
      if (field.type === "checkbox") {
        body[field.name] = form.get(field.name) === "on";
        continue;
      }
      const raw = form.get(field.name);
      if (raw == null || raw === "") continue;
      if (field.type === "number") {
        body[field.name] = Number(raw);
      } else {
        body[field.name] = String(raw);
      }
    }
    const result = await adminMutate(path, {
      method,
      ...(method === "DELETE" ? {} : { body }),
      token,
    });
    setPending(false);
    if (!result.ok) {
      setMessage(result.error ?? "Error");
      return;
    }
    setMessage("Guardado");
    onSuccess?.();
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 border border-[var(--border)] bg-white/80 p-4">
      <h3 className="font-serif text-lg">{title}</h3>
      {(fields ?? []).map((field) => (
        <label key={field.name} className="block text-sm">
          <span className="mb-1 block text-[var(--muted)]">{field.label}</span>
          {field.type === "textarea" ? (
            <textarea
              name={field.name}
              defaultValue={typeof field.defaultValue === "string" ? field.defaultValue : ""}
              required={field.required}
              className="w-full border border-[var(--border)] bg-white px-3 py-2"
              rows={4}
            />
          ) : field.type === "checkbox" ? (
            <input
              type="checkbox"
              name={field.name}
              defaultChecked={Boolean(field.defaultValue)}
              className="mr-2"
            />
          ) : field.type === "select" ? (
            <select
              name={field.name}
              defaultValue={String(field.defaultValue ?? "")}
              className="w-full border border-[var(--border)] bg-white px-3 py-2"
              required={field.required}
            >
              {(field.options ?? []).map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              name={field.name}
              type={field.type === "number" ? "number" : "text"}
              defaultValue={
                field.defaultValue === undefined || typeof field.defaultValue === "boolean"
                  ? undefined
                  : String(field.defaultValue)
              }
              required={field.required}
              className="w-full border border-[var(--border)] bg-white px-3 py-2"
            />
          )}
        </label>
      ))}
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Guardando…" : submitLabel}
        </Button>
        {message ? <p className="text-sm text-[var(--muted)]">{message}</p> : null}
      </div>
    </form>
  );
}

export function AdminSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-8 space-y-4">
      <h2 className="font-serif text-2xl">{title}</h2>
      {children}
    </section>
  );
}
