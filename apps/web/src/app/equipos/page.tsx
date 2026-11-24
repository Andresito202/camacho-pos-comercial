import { DraftBanner } from "@/components/DraftBanner";
import { EquipmentCard } from "@/components/EquipmentCard";
import { Section } from "@/components/Section";
import { getEquipmentList } from "@/lib/api";
import { buildMetadata, breadcrumbJsonLd, JsonLd } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Equipos",
  description: "Kits y periféricos Camacho POS Colombia: terminales, impresoras, lectores, cajones y balanzas según estado de certificación.",
  path: "/equipos",
});

export default async function EquiposPage() {
  const equipment = await getEquipmentList();
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Inicio", path: "/" }, { name: "Equipos", path: "/equipos" }])} />
      <DraftBanner source={equipment.source} />
      <Section eyebrow="Equipos" title="Hardware para armar tu kit" lead="Ilustraciones propias. El SKU comercial se confirma al emitir la orden.">
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {equipment.data.filter((i) => i.status !== "no_publicada").map((item) => (
            <EquipmentCard key={item.id} item={item} />
          ))}
        </div>
      </Section>
    </>
  );
}
