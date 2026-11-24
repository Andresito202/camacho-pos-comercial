import Link from "next/link";
import { Button } from "@camacho-pos/ui";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Página no encontrada",
  description: "La página solicitada no existe en Camacho POS Colombia.",
  path: "/404",
  noIndex: true,
});

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col justify-center px-4 py-20 text-center">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--teal)]">404</p>
      <h1 className="mt-3 font-serif text-4xl">No encontramos esta página</h1>
      <p className="mt-4 text-[var(--muted)]">
        Puede que el enlace haya cambiado. Vuelve al inicio o busca planes, equipos y cobertura.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/">
          <Button>Ir al inicio</Button>
        </Link>
        <Link href="/buscar">
          <Button variant="outline">Buscar</Button>
        </Link>
      </div>
    </div>
  );
}
