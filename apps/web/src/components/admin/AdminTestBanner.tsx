import { allowAdminTestFixture } from "@/lib/env";

export function AdminTestBanner() {
  if (!allowAdminTestFixture()) return null;
  return (
    <div
      role="status"
      className="mb-6 border border-[var(--yellow)] bg-[color-mix(in_srgb,var(--yellow)_22%,white)] px-4 py-3 text-sm text-[var(--navy)]"
    >
      <strong className="font-semibold">Modo prueba administrativa — no es producción.</strong>{" "}
      Acceso vía fixture <code className="text-xs">X-Admin-Test-Fixture</code>. No usar con datos
      reales ni cobros.
    </div>
  );
}
