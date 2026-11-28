"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { Button, Input, TextArea } from "@camacho-pos/ui";
import { CaptchaField, HoneypotField } from "@/components/FormSecurity";
import { storeTrialAccessToken, submitTrialRequest } from "@/lib/api";

export function TrialForm() {
  const [result, setResult] = useState<{
    id: string;
    accessToken?: string;
    statusPath?: string;
    status?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | undefined>();
  const [consentData, setConsentData] = useState(false);
  const [consentTerms, setConsentTerms] = useState(false);

  const onToken = useCallback((token: string | undefined) => setCaptchaToken(token), []);

  if (result) {
    const href = result.statusPath ?? `/prueba-5-dias/estado/${result.id}`;
    return (
      <div className="rounded-[var(--radius)] border border-[var(--teal)]/30 bg-[color-mix(in_srgb,var(--teal)_8%,white)] p-5">
        <p className="font-bold text-[var(--navy)]">Solicitud registrada — pendiente de activación</p>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Estado <code className="font-mono text-xs">{result.status ?? "PENDING_ACTIVATION"}</code>. El reloj de 120
          horas <strong>no ha iniciado</strong>: comienza solo cuando Central confirma la licencia POS real. El token de
          acceso queda en esta sesión del navegador (no en la URL).
        </p>
        <p className="mt-2 font-mono text-xs text-[var(--muted)]">Ref. {result.id}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href={href} className="inline-flex">
            <Button>Ver estado</Button>
          </Link>
          <Link href="/contratar" className="inline-flex">
            <Button variant="outline">Contratar ahora</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form
      className="relative space-y-4 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-soft)]"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        setError(null);
        const form = new FormData(event.currentTarget as HTMLFormElement);
        const payload: Record<string, string> = Object.fromEntries(
          [...form.entries()].map(([k, v]) => [k, String(v)]),
        );
        if (captchaToken) payload.captchaToken = captchaToken;
        payload.consentDataTreatment = consentData ? "true" : "false";
        payload.consentTerms = consentTerms ? "true" : "false";
        const res = await submitTrialRequest(payload);
        setPending(false);
        if (!res.ok || !res.id) {
          setError(res.error ?? "No se pudo registrar la prueba.");
          return;
        }
        if (res.accessToken) storeTrialAccessToken(res.id, res.accessToken);
        setResult({
          id: res.id,
          ...(res.accessToken ? { accessToken: res.accessToken } : {}),
          ...(res.statusPath ? { statusPath: res.statusPath } : {}),
          ...(res.status ? { status: res.status } : {}),
        });
      }}
    >
      <HoneypotField />
      <Input label="Nombre completo" name="fullName" required autoComplete="name" />
      <Input label="Correo" name="email" type="email" required autoComplete="email" />
      <Input label="Teléfono" name="phone" autoComplete="tel" placeholder="+57…" />
      <Input label="Negocio" name="companyName" required />
      <Input label="Sector" name="sector" placeholder="Tienda, droguería, panadería…" />
      <Input label="Ciudad" name="city" />
      <TextArea label="¿Qué quieres evaluar?" name="notes" />
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" className="mt-1" checked={consentData} onChange={(e) => setConsentData(e.target.checked)} />
        <span>
          Autorizo el tratamiento de datos conforme a la{" "}
          <Link href="/legal/tratamiento-de-datos" className="text-[var(--teal)] underline-offset-2 hover:underline">
            política de tratamiento
          </Link>{" "}
          (obligatorio).
        </span>
      </label>
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" className="mt-1" checked={consentTerms} onChange={(e) => setConsentTerms(e.target.checked)} />
        <span>
          Acepto que el reloj de 5 días inicia solo con activación real de licencia POS confirmada por Central; al
          vencer hay bloqueo y CTA de contratación (obligatorio).
        </span>
      </label>
      <CaptchaField onToken={onToken} />
      {error ? (
        <p className="text-sm text-[var(--danger)]" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending || !consentData || !consentTerms}>
        {pending ? "Registrando…" : "Solicitar prueba 5 días"}
      </Button>
    </form>
  );
}
