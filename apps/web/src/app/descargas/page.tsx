import Link from "next/link";
import { Button } from "@camacho-pos/ui";
import { buildMetadata } from "@/lib/seo";
import { getLoginHref, postLoginDestination } from "@/lib/auth";

export const metadata = buildMetadata({
  title: "Descargas e instalación",
  description: "Instalación Electron (Windows) y Android para cajeros Camacho POS Colombia. No hay POS web de mostrador.",
  path: "/descargas",
});

export default function DescargasPage() {
  const login = getLoginHref("/descargas");
  const cajero = postLoginDestination("CAJERO");

  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <h1 className="font-serif text-4xl">Descargas e instalación</h1>
      <p className="mt-4 text-lg text-[var(--muted)]">
        {cajero.note}
      </p>
      <div className="mt-8 space-y-5">
        <article className="border border-[var(--border)] bg-white/70 p-5">
          <h2 className="font-serif text-2xl">Electron — Windows</h2>
          <p className="mt-2 text-sm text-[var(--steel)]">
            Tras contratar, el canal comercial entrega el instalador firmado de la aplicación de caja para Windows y la
            guía de puesta en marcha. Requiere un equipo Windows del kit homologado.
          </p>
          <p className="mt-3 text-xs text-[var(--muted)]">El binario no se publica en abierto sin licencia activa.</p>
        </article>
        <article className="border border-[var(--border)] bg-white/70 p-5">
          <h2 className="font-serif text-2xl">Android — caja móvil / mostrador</h2>
          <p className="mt-2 text-sm text-[var(--steel)]">
            La app Android del kit se provisiona por el canal comercial. No uses APK de terceros.
          </p>
        </article>
        <article className="border border-[var(--yellow)] bg-[color-mix(in_srgb,var(--yellow)_14%,white)] p-5">
          <h2 className="font-serif text-2xl">Inicio de sesión</h2>
          <p className="mt-2 text-sm text-[var(--steel)]">
            Un solo botón visible en el sitio lleva al acceso de cuenta cuando está configurado.
          </p>
          {login.href ? (
            <a href={login.href} className="mt-4 inline-block"><Button>Iniciar sesión en Central</Button></a>
          ) : (
            <p className="mt-4 text-sm text-[var(--danger)]">{login.reason}</p>
          )}
        </article>
      </div>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/soporte"><Button variant="outline">Soporte</Button></Link>
        <Link href="/contratar"><Button>Contratar</Button></Link>
      </div>
    </div>
  );
}
