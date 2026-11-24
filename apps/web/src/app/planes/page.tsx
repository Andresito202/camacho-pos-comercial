import { DraftBanner } from "@/components/DraftBanner";
import { PlanCatalog } from "@/components/PlanCatalog";
import { Section } from "@/components/Section";
import { getEquipmentList, getPlans } from "@/lib/api";
import { isCatalogVisible } from "@/lib/format";
import { buildMetadata, breadcrumbJsonLd, JsonLd } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Planes y precios",
  description:
    "Planes Camacho POS Colombia en COP: Esencial, Profesional, Empresarial y Perpetua. Elige solo software o POS completo.",
  path: "/planes",
});

export default async function PlanesPage({
  searchParams,
}: {
  searchParams?: Promise<{ solucion?: string }>;
}) {
  const params = searchParams ? await searchParams : undefined;
  const initialSolutionMode = params?.solucion === "completo" ? "COMPLETE" : "SOFTWARE";
  const [plans, equipment] = await Promise.all([getPlans(), getEquipmentList()]);
  const visible = plans.data.filter((p) => isCatalogVisible(p.status));
  const kits = equipment.data.filter((item) => item.category === "Kit" || Boolean(item.kitId));

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Inicio", path: "/" },
          { name: "Planes y precios", path: "/planes" },
        ])}
      />
      <DraftBanner source={plans.source} />

      <section className="relative overflow-hidden bg-[var(--navy)] text-[var(--ivory)]">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(circle at 15% 20%, rgba(247,200,60,0.32), transparent 42%), radial-gradient(circle at 85% 10%, rgba(22,129,119,0.3), transparent 38%)",
          }}
        />
        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--yellow)]">Planes y precios</p>
          <h1 className="mt-3 max-w-3xl font-serif text-4xl leading-tight sm:text-5xl">
            Licencias claras para cada etapa de tu negocio
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-white/75">
            Elige solo software o POS completo, y compara mensual o anual. La licencia perpetua se presenta aparte. Los
            precios de referencia se confirman al publicar la oferta comercial.
          </p>
        </div>
      </section>

      <Section
        title="Catálogo comercial"
        lead="Tres planes recurrentes juntos; la licencia perpetua se presenta aparte. Una licencia = una caja."
      >
        {visible.length > 0 ? (
          <PlanCatalog plans={visible} kits={kits} initialSolutionMode={initialSolutionMode} />
        ) : (
          <p className="text-[var(--muted)]">No hay planes visibles en el catálogo en este momento.</p>
        )}
      </Section>
    </>
  );
}
