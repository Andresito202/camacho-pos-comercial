import Image from "next/image";
import Link from "next/link";
import { Button } from "@camacho-pos/ui";
import { FeatureIcon, featureIconCatalog } from "@/components/FeatureIcon";
import { Section } from "@/components/Section";
import { StatusBadge } from "@/components/StatusBadge";
import { getFeatures } from "@/lib/api";
import { buildMetadata, breadcrumbJsonLd, JsonLd } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Software POS",
  description:
    "Camacho POS Colombia: vende aunque se interrumpa internet, controla inventario, reportes y preparación fiscal con estados transparentes.",
  path: "/software-pos",
});

export default async function SoftwarePosPage() {
  const features = await getFeatures();
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Inicio", path: "/" }, { name: "Software POS", path: "/software-pos" }])} />
      <section className="bg-[var(--navy)] px-4 py-16 text-[var(--ivory)] sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--yellow)]">Software</p>
            <h1 className="mt-3 font-serif text-4xl sm:text-5xl">POS para el mostrador colombiano</h1>
            <p className="mt-5 text-lg text-white/75">
              Aplicación en Windows y app Android para cajeros. Este sitio web no sustituye la caja: comercializa, contrata y orienta la instalación.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/planes"><Button size="lg">Ver planes</Button></Link>
              <Link href="/descargas"><Button size="lg" variant="outline" className="border-white text-white">Descargas</Button></Link>
            </div>
          </div>
          <div className="relative min-h-[280px]"><Image src="/images/software/pos-ui.svg" alt="Interfaz ilustrada" fill className="object-contain" /></div>
        </div>
      </section>
      <Section title="Capacidades del producto" lead="El estado proviene del API comercial. Nunca marcamos como Disponible una capacidad en certificación.">
        <div className="space-y-4">
          {features.data.map((f) => (
            <div key={f.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] py-3">
              <div>
                <h2 className="font-serif text-xl">{f.name}</h2>
                <p className="text-sm text-[var(--muted)]">{f.description}</p>
              </div>
              <StatusBadge status={f.status} />
            </div>
          ))}
        </div>
      </Section>
      <Section title="Áreas cubiertas">
        <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-9">
          {featureIconCatalog.map((item) => (
            <div key={item.name} className="flex flex-col items-center gap-2 text-center text-sm">
              <FeatureIcon name={item.name} label={item.label} />
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
