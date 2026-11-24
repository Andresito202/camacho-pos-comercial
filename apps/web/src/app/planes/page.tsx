import { DraftBanner } from "@/components/DraftBanner";
import { PlanCard } from "@/components/PlanCard";
import { Section } from "@/components/Section";
import { getPlans } from "@/lib/api";
import { buildMetadata, breadcrumbJsonLd, JsonLd } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Planes",
  description: "Planes Camacho POS Colombia en COP: Caja Esencial, Negocio y Empresa con estados reales de disponibilidad.",
  path: "/planes",
});

export default async function PlanesPage() {
  const plans = await getPlans();
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Inicio", path: "/" }, { name: "Planes", path: "/planes" }])} />
      <DraftBanner source={plans.source} />
      <Section eyebrow="Planes" title="Licencias para cada etapa del negocio" lead="Contrata solo lo Disponible. Los planes en certificación se muestran con su estado.">
        <div className="grid gap-5 lg:grid-cols-3">
          {plans.data.filter((p) => p.status !== "no_publicada").map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </div>
      </Section>
    </>
  );
}
