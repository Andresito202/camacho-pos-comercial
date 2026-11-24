import { DraftBanner } from "@/components/DraftBanner";
import { EquiposCatalog } from "@/components/EquiposCatalog";
import { Section } from "@/components/Section";
import { getEquipmentList } from "@/lib/api";
import { buildMetadata, breadcrumbJsonLd, JsonLd } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Equipos",
  description:
    "Kits y periféricos Camacho POS Colombia: terminales, impresoras, lectores, cajones y balanzas. Ilustraciones referenciales — no fotos de modelos reales.",
  path: "/equipos",
});

export default async function EquiposPage() {
  const equipment = await getEquipmentList();
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Inicio", path: "/" }, { name: "Equipos", path: "/equipos" }])} />
      <DraftBanner source={equipment.source} />

      <section className="relative overflow-hidden bg-[var(--navy)] text-[var(--ivory)]">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(circle at 20% 20%, rgba(247,200,60,0.32), transparent 42%), radial-gradient(circle at 80% 10%, rgba(22,129,119,0.3), transparent 38%)",
          }}
        />
        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--yellow)]">Equipos</p>
          <h1 className="mt-3 max-w-3xl font-serif text-4xl leading-tight sm:text-5xl">
            Hardware para armar tu kit POS
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-white/75">
            Terminales, impresoras, lectores, cajones y balanzas con ilustraciones referenciales (no fotos de modelos
            reales). Filtra por categoría, compara y agrega al carrito.
          </p>
        </div>
      </section>

      <Section
        title="Catálogo de equipos"
        lead="Filtra por categoría, compara 2–3 equipos y agrega al carrito. Cada imagen está marcada como ilustración referencial."
      >
        <EquiposCatalog items={equipment.data} />
      </Section>
    </>
  );
}
