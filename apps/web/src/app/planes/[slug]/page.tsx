import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@camacho-pos/ui";
import { HireModalTrigger } from "@/components/HireModal";
import { StatusBadge } from "@/components/StatusBadge";
import { getPlan, getPlans } from "@/lib/api";
import { formatMoney, isPubliclySellable } from "@/lib/format";
import { buildMetadata, breadcrumbJsonLd, JsonLd, productJsonLd } from "@/lib/seo";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const plans = await getPlans().catch(() => ({ data: [] as Array<{ slug: string }> }));
  return plans.data.map((plan) => ({ slug: plan.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const { data } = await getPlan(slug);
  if (!data) return buildMetadata({ title: "Plan", description: "Plan no encontrado", path: `/planes/${slug}`, noIndex: true });
  return buildMetadata({ title: data.name, description: data.tagline, path: `/planes/${data.slug}` });
}

export default async function PlanDetailPage({ params }: Props) {
  const { slug } = await params;
  const { data: plan } = await getPlan(slug);
  if (!plan || plan.status === "no_publicada") notFound();
  const availability = isPubliclySellable(plan.status) ? "InStock" : plan.status === "proximamente" ? "PreOrder" : "OutOfStock";
  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <JsonLd data={[
        breadcrumbJsonLd([{ name: "Inicio", path: "/" }, { name: "Planes", path: "/planes" }, { name: plan.name, path: `/planes/${plan.slug}` }]),
        productJsonLd({ name: plan.name, description: plan.description, path: `/planes/${plan.slug}`, sku: plan.id, priceCents: plan.priceMonthly.amountCents, availability }),
      ]} />
      <div className="mb-4"><StatusBadge status={plan.status} /></div>
      <h1 className="font-serif text-4xl">{plan.name}</h1>
      <p className="mt-3 text-lg text-[var(--muted)]">{plan.tagline}</p>
      <p className="mt-6 font-serif text-4xl">{formatMoney(plan.priceMonthly)} <span className="text-lg font-sans text-[var(--muted)]">/ mes</span></p>
      <p className="mt-6 text-[var(--steel)]">{plan.description}</p>
      <ul className="mt-6 list-disc space-y-2 pl-5 text-[var(--steel)]">
        {plan.highlights.map((h) => <li key={h}>{h}</li>)}
      </ul>
      {plan.includesHardwareHint ? <p className="mt-4 text-sm text-[var(--muted)]">{plan.includesHardwareHint}</p> : null}
      <div className="mt-8 flex flex-wrap gap-3">
        <HireModalTrigger plan={plan} />
        <Link href={`/contratar?plan=${plan.slug}`}><Button variant="secondary">Contratar con este plan</Button></Link>
        <Link href="/carrito"><Button variant="outline">Ver carrito</Button></Link>
      </div>
      <p className="mt-6 text-xs text-[var(--muted)]">Identificador de plan: {plan.id}</p>
    </div>
  );
}
