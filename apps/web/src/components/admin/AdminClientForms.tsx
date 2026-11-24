"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@camacho-pos/ui";
import { adminMutate } from "@/lib/api";

type Field = {
  name: string;
  label: string;
  type?: "text" | "number" | "textarea" | "checkbox" | "select" | "datetime-local";
  defaultValue?: string | number | boolean;
  options?: Array<{ value: string; label: string }>;
  required?: boolean;
  hint?: string;
};

/** Interpret America/Bogota wall-clock from datetime-local as ISO UTC. */
function bogotaLocalToIso(local: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(local.trim());
  if (!match) return local;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  const hh = Number(match[4]);
  const mm = Number(match[5]);
  const ss = Number(match[6] ?? "0");
  return new Date(Date.UTC(y, m - 1, d, hh + 5, mm, ss)).toISOString();
}

/** Convert ISO instant to datetime-local value in America/Bogota. */
export function isoToBogotaDatetimeLocal(iso?: string | null): string {
  if (!iso) return "";
  const value = new Date(iso);
  if (Number.isNaN(value.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(value);
  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "00";
  return `${pick("year")}-${pick("month")}-${pick("day")}T${pick("hour")}:${pick("minute")}`;
}

function setNested(target: Record<string, unknown>, path: string, value: unknown) {
  const segments = path.split(".");
  let cursor: Record<string, unknown> = target;
  for (let i = 0; i < segments.length - 1; i += 1) {
    const key = segments[i]!;
    const next = cursor[key];
    if (!next || typeof next !== "object") {
      cursor[key] = {};
    }
    cursor = cursor[key] as Record<string, unknown>;
  }
  cursor[segments[segments.length - 1]!] = value;
}

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
        const value = form.get(field.name) === "on";
        if (field.name.includes(".")) setNested(body, field.name, value);
        else body[field.name] = value;
        continue;
      }
      const raw = form.get(field.name);
      if (raw == null || raw === "") continue;
      let value: unknown;
      if (field.type === "number") {
        value = Number(raw);
      } else if (field.type === "datetime-local") {
        value = bogotaLocalToIso(String(raw));
      } else {
        value = String(raw);
      }
      if (field.name.includes(".")) setNested(body, field.name, value);
      else body[field.name] = value;
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
              type={
                field.type === "number"
                  ? "number"
                  : field.type === "datetime-local"
                    ? "datetime-local"
                    : "text"
              }
              defaultValue={
                field.defaultValue === undefined || typeof field.defaultValue === "boolean"
                  ? undefined
                  : String(field.defaultValue)
              }
              required={field.required}
              className="w-full border border-[var(--border)] bg-white px-3 py-2"
            />
          )}
          {field.hint ? <span className="mt-1 block text-xs text-[var(--steel)]">{field.hint}</span> : null}
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

export function AdminEmptyState({ title, detail }: { title: string; detail?: string }) {
  return (
    <div className="border border-dashed border-[var(--border)] bg-white/50 px-4 py-8 text-center">
      <p className="font-serif text-xl text-[var(--navy)]">{title}</p>
      {detail ? <p className="mt-2 text-sm text-[var(--muted)]">{detail}</p> : null}
    </div>
  );
}

export function AdminFilterForm({
  action,
  statusOptions,
  status,
  q,
  showSearch = true,
}: {
  action: string;
  statusOptions: Array<{ value: string; label: string }>;
  status?: string;
  q?: string;
  showSearch?: boolean;
}) {
  return (
    <form method="get" action={action} className="flex flex-wrap items-end gap-3 border border-[var(--border)] bg-white/70 p-3">
      <label className="text-sm">
        <span className="mb-1 block text-[var(--muted)]">Estado</span>
        <select
          name="status"
          defaultValue={status ?? ""}
          className="border border-[var(--border)] bg-white px-3 py-2"
        >
          <option value="">Todos</option>
          {statusOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>
      {showSearch ? (
        <label className="text-sm">
          <span className="mb-1 block text-[var(--muted)]">Buscar</span>
          <input
            name="q"
            type="search"
            defaultValue={q ?? ""}
            placeholder="Nombre o email"
            className="border border-[var(--border)] bg-white px-3 py-2"
          />
        </label>
      ) : null}
      <Button type="submit" size="sm" variant="secondary">
        Filtrar
      </Button>
    </form>
  );
}
