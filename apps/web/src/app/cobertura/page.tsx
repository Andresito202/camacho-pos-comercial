import Link from "next/link";
import { DraftBanner } from "@/components/DraftBanner";
import { Section } from "@/components/Section";
import { StatusBadge } from "@/components/StatusBadge";
import { getCoverage } from "@/lib/api";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Cobertura",
  description: "Ciudades con cobertura comercial Camacho POS Colombia y tiempos orientativos de entrega.",
  path: "/cobertura",
});

export default async function CoberturaPage() {
  const coverage = await getCoverage();
  return (
    <>
      <DraftBanner source={coverage.source} />
      <Section eyebrow="Cobertura" title="Dónde atendemos" lead="Lead times orientativos de hardware. La instalación remota de software puede iniciar antes del despacho.">
        <div className="grid gap-4 md:grid-cols-2">
          {coverage.data.map((city) => (
            <Link key={city.slug} href={`/cobertura/${city.slug}`} className="bg-white/70 p-5 hover:border-[var(--teal)] border border-transparent">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-serif text-2xl">{city.name}</h2>
                  <p className="text-sm text-[var(--muted)]">{city.department}</p>
                </div>
                <StatusBadge status={city.status} />
              </div>
              <p className="mt-3 text-sm text-[var(--steel)]">{city.summary}</p>
              <p className="mt-3 text-xs text-[var(--muted)]">Lead time orientativo: {city.leadTimeDays} días</p>
            </Link>
          ))}
        </div>
      </Section>
    </>
  );
}
