"use client";

import { useState } from "react";
import { Button, Input, TextArea } from "@camacho-pos/ui";
import { submitDemoRequest } from "@/lib/api";

export function DemoForm() {
  const [ok, setOk] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (ok) {
    return <p className="rounded bg-[color-mix(in_srgb,var(--teal)_12%,white)] p-4 text-[var(--navy)]">Solicitud registrada ({ok}). Te contactaremos en horario hábil.</p>;
  }

  return (
    <form
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        setError(null);
        const form = new FormData(event.currentTarget);
        const payload = Object.fromEntries([...form.entries()].map(([k, v]) => [k, String(v)])) as Record<string, string>;
        const result = await submitDemoRequest(payload);
        setPending(false);
        if (!result.ok) {
          setError("No se pudo enviar. Verifica commercial-api o intenta por WhatsApp.");
          return;
        }
        setOk(result.id ?? "ok");
      }}
    >
      <Input label="Nombre" name="name" required />
      <Input label="Negocio" name="business" required />
      <Input label="Correo" name="email" type="email" required />
      <Input label="Teléfono / WhatsApp" name="phone" required />
      <Input label="Ciudad" name="city" required />
      <Input label="Sector" name="sector" placeholder="Tienda, droguería, panadería…" required />
      <TextArea label="¿Qué quieres ver en la demo?" name="goals" required />
      {error ? <p className="text-sm text-[var(--danger)]" role="alert">{error}</p> : null}
      <Button type="submit" disabled={pending}>{pending ? "Enviando…" : "Enviar solicitud"}</Button>
    </form>
  );
}
