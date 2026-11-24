import Image from "next/image";
import { Section } from "@/components/Section";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Nosotros",
  description: "Camacho POS Colombia: software local-first y kits para el comercio colombiano.",
  path: "/nosotros",
});

export default function NosotrosPage() {
  return (
    <>
      <section className="bg-[var(--navy)] px-4 py-16 text-[var(--ivory)] sm:px-6">
        <div className="mx-auto flex max-w-4xl flex-col gap-6">
          <Image src="/brand/logo-yellow.png" alt="Camacho POS Colombia" width={280} height={100} className="h-16 w-auto" />
          <h1 className="font-serif text-4xl sm:text-5xl">Contabilidad y precisión siempre.</h1>
          <p className="text-lg text-white/75">
            Construimos un POS para el mostrador real: cortes de Internet, roles estrictos, facturación por adapters y hardware por kit.
            La web comercial vende y contrata; la caja vive en Electron y Android.
          </p>
        </div>
      </section>
      <Section title="Principios" lead="No negociamos seguridad fail-closed ni last-write-wins genérico.">
        <ul className="grid gap-4 md:grid-cols-2">
          {[
            "Local-first: la venta ordinaria no depende de Internet.",
            "Un ID de cliente no otorga autoridad de tenant.",
            "Hechos financieros e inventario append-only cuando el contrato lo exige.",
            "Estados de capacidad honestos: Disponible / En certificación / Próximamente / No publicada.",
          ].map((item) => (
            <li key={item} className="border-l-4 border-[var(--yellow)] bg-white/70 pl-4 py-3">{item}</li>
          ))}
        </ul>
      </Section>
    </>
  );
}
