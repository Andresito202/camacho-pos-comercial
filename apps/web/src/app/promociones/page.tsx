import Link from "next/link";
import { DraftBanner } from "@/components/DraftBanner";
import { Section } from "@/components/Section";
import { StatusBadge } from "@/components/StatusBadge";
import { getPromotions } from "@/lib/api";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Promociones",
  description: "Promociones vigentes de Camacho POS Colombia cargadas desde el API comercial.",
  path: "/promociones",
});

export default async function PromocionesPage() {
  const promotions = await getPromotions();
  return (
    <>
      <DraftBanner source={promotions.source} />
      <Section eyebrow="Promociones" title="Ofertas publicadas" lead="Sin urgencia inventada. Solo lo que el API marca como publicado.">
        <div className="grid gap-5 md:grid-cols-2">
          {promotions.data.map((promo) => (
            <article key={promo.id} className="bg-white/70 p-6">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="font-serif text-2xl">{promo.title}</h2>
                <StatusBadge status={promo.status} />
              </div>
              <p className="text-[var(--muted)]">{promo.summary}</p>
              {promo.validUntil ? <p className="mt-3 text-sm text-[var(--muted)]">Vigente hasta {promo.validUntil}</p> : null}
              <Link href={promo.ctaHref} className="mt-4 inline-block font-medium text-[var(--teal)] underline-offset-2 hover:underline">{promo.ctaLabel}</Link>
            </article>
          ))}
        </div>
      </Section>
    </>
  );
}
