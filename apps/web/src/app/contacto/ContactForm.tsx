"use client";

import { useCallback, useState } from "react";
import { Button, Input, TextArea } from "@camacho-pos/ui";
import { CaptchaField, HoneypotField } from "@/components/FormSecurity";
import { submitContact } from "@/lib/api";

export function ContactForm() {
  const [ok, setOk] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | undefined>();
  const onToken = useCallback((token: string | undefined) => setCaptchaToken(token), []);

  if (ok) return <p className="rounded bg-[color-mix(in_srgb,var(--teal)_12%,white)] p-4">Mensaje enviado. Responderemos a tu correo.</p>;

  return (
    <form
      className="relative space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        setError(null);
        const form = new FormData(event.currentTarget as HTMLFormElement);
        const payload = Object.fromEntries([...form.entries()].map(([k, v]) => [k, String(v)])) as Record<
          string,
          string
        >;
        if (captchaToken) payload.captchaToken = captchaToken;
        const result = await submitContact(payload);
        setPending(false);
        if (!result.ok) {
          setError("No se pudo enviar el mensaje.");
          return;
        }
        setOk(true);
      }}
    >
      <HoneypotField />
      <Input label="Nombre" name="name" required />
      <Input label="Correo" name="email" type="email" required />
      <Input label="Teléfono" name="phone" />
      <Input label="Asunto" name="subject" required />
      <TextArea label="Mensaje" name="message" required />
      <CaptchaField onToken={onToken} />
      {error ? (
        <p className="text-sm text-[var(--danger)]" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Enviando…" : "Enviar"}
      </Button>
    </form>
  );
}
