import Link from "next/link";
import { Button } from "@camacho-pos/ui";
import { FeatureIcon } from "@/components/FeatureIcon";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Soporte",
  description: "Centro de soporte Camacho POS Colombia: instalación, incidentes y canales por plan.",
  path: "/soporte",
});

export default function SoportePage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6">
      <div className="flex items-center gap-4">
        <FeatureIcon name="soporte" label="Soporte" size={56} />
        <h1 className="font-serif text-4xl">Soporte</h1>
      </div>
      <p className="mt-4 text-lg text-[var(--muted)]">
        Primer contacto comercial y guía de instalación. Los incidentes de caja se atienden según el plan contratado.
      </p>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {[
          { t: "Instalación", d: "Guías Electron y Android en Descargas.", href: "/descargas" },
          { t: "FAQ", d: "Respuestas sobre venta sin internet, roles y facturación.", href: "/preguntas-frecuentes" },
          { t: "Contacto", d: "Correo y formulario comercial.", href: "/contacto" },
        ].map((item) => (
          <Link key={item.t} href={item.href} className="bg-white/70 p-5">
            <h2 className="font-serif text-xl">{item.t}</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">{item.d}</p>
          </Link>
        ))}
      </div>
      <div className="mt-10 rounded border border-[var(--border)] bg-[color-mix(in_srgb,var(--yellow)_12%,white)] p-5">
        <h2 className="font-serif text-2xl">Importante sobre roles</h2>
        <p className="mt-2 text-[var(--steel)]">
          Superadministrador, administrador y supervisor no son cajeros. Tras iniciar sesión, el cajero debe
          instalar la app de caja — no operar desde este sitio.
        </p>
        <Link href="/descargas" className="mt-4 inline-block"><Button>Ir a descargas</Button></Link>
      </div>
    </div>
  );
}
