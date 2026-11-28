import Image from "next/image";
import Link from "next/link";
import { Section } from "@/components/Section";
import { getSolutions } from "@/lib/api";
import { buildMetadata, breadcrumbJsonLd, JsonLd } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Soluciones por sector",
  description:
    "Soluciones Camacho POS para tiendas, supermercados, droguerías, avícolas, salsamentarias, panaderías y pastelerías.",
  path: "/soluciones",
});

export default async function SolucionesPage() {
  const solutions = await getSolutions();
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Inicio", path: "/" }, { name: "Soluciones", path: "/soluciones" }])} />
      <Section
        eyebrow="Soluciones"
        title="Sector por sector, sin promesas genéricas"
        lead="Cada vertical lista retos reales y capacidades con su estado comercial actual."
      >
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {solutions.data.map((s) => (
            <Link key={s.slug} href={`/soluciones/${s.slug}`} className="overflow-hidden bg-white/70">
              <div className="relative aspect-[16/10]"><Image src={s.image} alt={s.name} fill className="object-cover" /></div>
              <div className="p-5">
                <h2 className="font-serif text-2xl">{s.name}</h2>
                <p className="mt-2 text-sm text-[var(--muted)]">{s.headline}</p>
              </div>
            </Link>
          ))}
        </div>
      </Section>
    </>
  );
}
