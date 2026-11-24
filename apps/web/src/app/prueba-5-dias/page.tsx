import { buildMetadata } from "@/lib/seo";
import { TrialForm } from "./TrialForm";

export const metadata = buildMetadata({
  title: "Prueba 5 días",
  description:
    "Solicita la prueba comercial de 5 días de Camacho POS Colombia. Condiciones visibles, registro CRM y CTA de contratación al vencer.",
  path: "/prueba-5-dias",
});

export default function Prueba5DiasPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--teal)]">Evaluación comercial</p>
      <h1 className="mt-2 text-4xl font-bold text-balance">Prueba 5 días</h1>
      <p className="mt-4 text-lg text-[var(--muted)]">
        Registra tu negocio para una evaluación comercial de cinco días. Verás el estado del trial, la fecha de
        vencimiento y, al expirar, un mensaje de bloqueo con acceso directo a contratar.
      </p>

      <div className="mt-8 grid gap-4 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-soft)] sm:grid-cols-2">
        <div>
          <h2 className="font-bold">Qué incluye</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[var(--muted)]">
            <li>Registro CRM con estado ACTIVE</li>
            <li>Ventana de 5 días calendario</li>
            <li>Expiración automática al vencer</li>
            <li>CTA para contratar plan publicado</li>
          </ul>
        </div>
        <div>
          <h2 className="font-bold">Condiciones</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[var(--muted)]">
            <li>No es cobro real ni pasarela de prueba</li>
            <li>Un correo = un registro activo a la vez (revisión comercial)</li>
            <li>Al vencer, el acceso de prueba queda bloqueado</li>
            <li>
              La licencia POS en Windows/Android requiere aprovisionamiento Central en{" "}
              <strong>pos-platform</strong>. Detalle del contrato faltante en{" "}
              <code className="text-xs">docs/commercial/trial-5-days.md</code>.
            </li>
          </ul>
        </div>
      </div>

      <div className="mt-8">
        <TrialForm />
      </div>
    </div>
  );
}
