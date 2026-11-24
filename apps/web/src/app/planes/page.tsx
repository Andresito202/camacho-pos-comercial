import { DraftBanner } from "@/components/DraftBanner";
import { PlanCard } from "@/components/PlanCard";
import { Section } from "@/components/Section";
import { getPlans } from "@/lib/api";
import { isCatalogVisible } from "@/lib/format";
import { buildMetadata, breadcrumbJsonLd, JsonLd } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Planes",
  description: "Planes Camacho POS Colombia en COP: Caja Esencial, Negocio y Empresa con estados reales de disponibilidad.",
  path: "/planes",
});

export default async function PlanesPage() {
  const plans = await getPlans();
  const visible = plans.data.filter((p) => isCatalogVisible(p.status));
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Inicio", path: "/" }, { name: "Planes", path: "/planes" }])} />
      <DraftBanner source={plans.source} />
      <Section
        eyebrow="Planes"
        title="Licencias para cada etapa del negocio"
        lead="Los precios provisionales aparecen como Borrador hasta autorización del propietario. La compra real exige precios publicados y pasarela certificada."
      >
        <div className="grid gap-5 lg:grid-cols-3">
          {visible.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </div>
        {visible.length === 0 ? (
          <p className="mt-6 text-[var(--muted)]">No hay planes visibles en el catálogo en este momento.</p>
        ) : null}
      </Section>
    </>
  );
}
