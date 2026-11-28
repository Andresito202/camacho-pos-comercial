import Link from "next/link";
import { Button } from "@camacho-pos/ui";
import { DraftBanner } from "@/components/DraftBanner";
import { HireModalTrigger } from "@/components/HireModal";
import { StatusBadge } from "@/components/StatusBadge";
import { getPlan, getPlans } from "@/lib/api";
import { formatMoney, isPubliclySellable } from "@/lib/format";
import { buildMetadata } from "@/lib/seo";
import { WhatsAppHire } from "./WhatsAppHire";

export const metadata = buildMetadata({
  title: "Contratar",
  description: "Contrata Camacho POS Colombia: elige plan, agrega equipos y avanza al checkout o WhatsApp.",
  path: "/contratar",
});

type Props = { searchParams: Promise<{ plan?: string; ciudad?: string }> };

export default async function ContratarPage({ searchParams }: Props) {
  const { plan: planSlug, ciudad } = await searchParams;
  const plans = await getPlans();
  const selected = planSlug ? (await getPlan(planSlug)).data : plans.data.find((p) => p.featured) ?? plans.data[0];

  return (
    <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6">
      <DraftBanner source={plans.source} />
      <h1 className="font-serif text-4xl">Contratar Camacho POS</h1>
      <p className="mt-3 text-lg text-[var(--muted)]">
        Selecciona un plan Disponible, agrégalo al carrito y completa el checkout. Los cajeros instalarán la app en Windows o
        Android después del alta — no hay POS web de mostrador.
      </p>
      {ciudad ? <p className="mt-2 text-sm text-[var(--teal)]">Ciudad de interés: {ciudad}</p> : null}

      <div className="mt-10 grid gap-4">
        {plans.data
          .filter((plan) => plan.status !== "no_publicada")
          .map((plan) => (
            <article key={plan.id} className="flex flex-wrap items-center justify-between gap-4 border border-[var(--border)] bg-white/70 p-5">
              <div>
                <div className="mb-2 flex items-center gap-3">
                  <h2 className="font-serif text-2xl">{plan.name}</h2>
                  <StatusBadge status={plan.status} />
                </div>
                <p className="text-sm text-[var(--muted)]">{plan.tagline}</p>
                <p className="mt-2 font-medium">{formatMoney(plan.priceMonthly)} / mes</p>
                <p className="text-xs text-[var(--muted)]">id: {plan.id}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {isPubliclySellable(plan.status) ? <HireModalTrigger plan={plan} /> : <Button disabled>No contratable aún</Button>}
                <Link href={`/planes/${plan.slug}`}>
                  <Button variant="outline">Detalle</Button>
                </Link>
              </div>
            </article>
          ))}
      </div>

      {selected ? (
        <div className="mt-10 space-y-4 border-t border-[var(--border)] pt-8">
          <h2 className="font-serif text-2xl">Continuar con {selected.name}</h2>
          <div className="flex flex-wrap gap-3">
            <Link href="/carrito">
              <Button>Ir al carrito</Button>
            </Link>
            <Link href="/checkout">
              <Button variant="secondary">Checkout</Button>
            </Link>
            <WhatsAppHire planId={selected.id} planSlug={selected.slug} {...(ciudad ? { city: ciudad } : {})} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
