import Link from "next/link";
import { Button } from "@camacho-pos/ui";
import { getTrialStatus } from "@/lib/api";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Estado de la prueba 5 días",
  description: "Consulta el estado, vencimiento y bloqueo de tu prueba comercial Camacho POS Colombia.",
  path: "/prueba-5-dias/estado",
});

export default async function TrialStatusPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const trial = await getTrialStatus(id);

  if (!trial) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-3xl font-bold">Prueba no encontrada</h1>
        <p className="mt-3 text-[var(--muted)]">Verifica el enlace o registra una nueva prueba.</p>
        <Link href="/prueba-5-dias" className="mt-6 inline-flex">
          <Button>Prueba 5 días</Button>
        </Link>
      </div>
    );
  }

  const blocked = trial.blocked || trial.status === "EXPIRED" || trial.status === "BLOCKED";

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--teal)]">Estado del trial</p>
      <h1 className="mt-2 text-3xl font-bold">Prueba 5 días</h1>

      {blocked ? (
        <div className="mt-6 rounded-[var(--radius)] border border-[var(--danger)]/40 bg-[color-mix(in_srgb,var(--danger)_8%,white)] p-5">
          <p className="text-lg font-bold text-[var(--danger)]">Prueba vencida — acceso bloqueado</p>
          <p className="mt-2 text-sm text-[var(--navy)]">
            {trial.blockedReason ??
              "Tu prueba de 5 días finalizó. Contrata un plan publicado para continuar con Camacho POS Colombia."}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/contratar" className="inline-flex">
              <Button>Contratar ahora</Button>
            </Link>
            <Link href="/planes" className="inline-flex">
              <Button variant="outline">Ver planes</Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-6 rounded-[var(--radius)] border border-[var(--teal)]/30 bg-[color-mix(in_srgb,var(--teal)_8%,white)] p-5">
          <p className="font-bold text-[var(--navy)]">Prueba activa</p>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Vigente hasta <strong>{new Date(trial.expiresAt).toLocaleString("es-CO")}</strong>. Al vencer, este
            portal mostrará el bloqueo y el CTA de contratación.
          </p>
        </div>
      )}

      <dl className="mt-8 grid gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-5 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-[var(--muted)]">Estado</dt>
          <dd className="font-bold">{trial.status}</dd>
        </div>
        <div>
          <dt className="text-[var(--muted)]">Referencia</dt>
          <dd className="font-mono text-xs">{trial.id}</dd>
        </div>
        <div>
          <dt className="text-[var(--muted)]">Inicio</dt>
          <dd>{new Date(trial.startsAt).toLocaleString("es-CO")}</dd>
        </div>
        <div>
          <dt className="text-[var(--muted)]">Vence</dt>
          <dd>{new Date(trial.expiresAt).toLocaleString("es-CO")}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-[var(--muted)]">Licencia POS (pos-platform)</dt>
          <dd className="mt-1 text-[var(--muted)]">
            {trial.posLicenseProvisioning?.gap ??
              "Pendiente de contrato Central GLOBAL / provisioning en pos-platform."}
          </dd>
        </div>
      </dl>
    </div>
  );
}
