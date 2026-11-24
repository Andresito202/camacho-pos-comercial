import { DraftBanner } from "@/components/DraftBanner";
import { EquiposCatalog } from "@/components/EquiposCatalog";
import { Section } from "@/components/Section";
import { getEquipmentList } from "@/lib/api";
import { buildMetadata, breadcrumbJsonLd, JsonLd } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Equipos",
  description:
    "Kits y periféricos Camacho POS Colombia: terminales, impresoras, lectores, cajones y balanzas. Ilustraciones SVG — no fotos de modelos reales.",
  path: "/equipos",
});

export default async function EquiposPage() {
  const equipment = await getEquipmentList();
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Inicio", path: "/" }, { name: "Equipos", path: "/equipos" }])} />
      <DraftBanner source={equipment.source} />
      <Section
        eyebrow="Equipos"
        title="Hardware para armar tu kit"
        lead="Ilustraciones SVG propias (no fotos de modelos reales). Filtra por categoría, compara 2–3 y agrega al carrito con ids de variante."
      >
        <EquiposCatalog items={equipment.data} />
      </Section>
    </>
  );
}
