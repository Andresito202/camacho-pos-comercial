"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@camacho-pos/ui";
import { HireModalTrigger } from "@/components/HireModal";
import { StatusBadge } from "@/components/StatusBadge";
import { formatMoney, featureStatusLabel } from "@/lib/format";
import type { BillingInterval, Equipment, Plan, PlanFeature } from "@/lib/types";

type SolutionMode = "SOFTWARE" | "COMPLETE";

function resolvePrice(plan: Plan, interval: BillingInterval) {
  const option = plan.prices?.[interval];
  if (option) {
    return {
      money: { amountCents: option.amountCents, currency: "COP" as const },
      planPriceId: option.planPriceId,
      priceVersion: option.version,
      interval,
    };
  }
  if (interval === "MONTHLY" && plan.priceMonthly && plan.primaryInterval !== "PERPETUAL") {
    return {
      money: plan.priceMonthly,
      planPriceId: plan.planPriceId,
      priceVersion: plan.priceVersion,
      interval: plan.primaryInterval ?? "MONTHLY",
    };
  }
  if (interval === "ANNUAL" && plan.priceYearly) {
    return {
      money: plan.priceYearly,
      planPriceId: plan.prices?.ANNUAL?.planPriceId ?? plan.planPriceId,
      priceVersion: plan.prices?.ANNUAL?.version ?? plan.priceVersion,
      interval: "ANNUAL" as const,
    };
  }
  if (interval === "PERPETUAL" && (plan.pricePerpetual || plan.primaryInterval === "PERPETUAL")) {
    return {
      money: plan.pricePerpetual ?? plan.priceMonthly,
      planPriceId: plan.prices?.PERPETUAL?.planPriceId ?? plan.planPriceId,
      priceVersion: plan.prices?.PERPETUAL?.version ?? plan.priceVersion,
      interval: "PERPETUAL" as const,
    };
  }
  return null;
}

function planForInterval(plan: Plan, interval: BillingInterval): Plan | null {
  const resolved = resolvePrice(plan, interval);
  if (!resolved) return null;
  return {
    ...plan,
    priceMonthly: resolved.money,
    primaryInterval: resolved.interval,
    ...(resolved.planPriceId ? { planPriceId: resolved.planPriceId } : {}),
    ...(resolved.priceVersion != null ? { priceVersion: resolved.priceVersion } : {}),
  };
}

function intervalSuffix(interval: BillingInterval) {
  if (interval === "PERPETUAL") return " pago único";
  if (interval === "ANNUAL") return " / año";
  return " / mes";
}

function ToggleGroup<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">{label}</p>
      <div className="inline-flex flex-wrap rounded-lg border border-[var(--border)] bg-white/80 p-1">
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                active
                  ? "bg-[var(--navy)] text-[var(--ivory)]"
                  : "text-[var(--steel)] hover:bg-[color-mix(in_srgb,var(--navy)_6%,transparent)]"
              }`}
              aria-pressed={active}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CommercialPlanCard({
  plan,
  interval,
  solutionMode,
}: {
  plan: Plan;
  interval: BillingInterval;
  solutionMode: SolutionMode;
}) {
  const priced = planForInterval(plan, interval);
  const cajas = plan.licensesPerUnit ?? 1;
  const displayPlan = priced ?? plan;

  return (
    <article className="flex h-full flex-col border-t-4 border-[var(--yellow)] bg-white/80 p-6 shadow-[0_1px_0_rgba(16,28,45,0.06)]">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-serif text-2xl text-[var(--navy)]">{plan.name}</h3>
          <p className="mt-2 text-sm text-[var(--muted)]">{plan.tagline || plan.description}</p>
        </div>
        <StatusBadge status={plan.status} />
      </div>
      {priced ? (
        <p className="font-serif text-3xl text-[var(--navy)]">
          {formatMoney(priced.priceMonthly)}
          <span className="text-base font-sans text-[var(--muted)]">{intervalSuffix(interval)}</span>
        </p>
      ) : (
        <p className="font-serif text-2xl text-[var(--navy)]">Consulta comercial</p>
      )}
      <ul className="mt-4 space-y-1.5 text-sm text-[var(--steel)]">
        <li>
          <span className="text-[var(--teal)]">✓</span> {cajas} caja{cajas === 1 ? "" : "s"} por licencia
        </li>
        <li>
          <span className="text-[var(--teal)]">✓</span> {plan.supportNote ?? "Soporte comercial según plan"}
        </li>
      </ul>
      {solutionMode === "COMPLETE" ? (
        <p className="mt-4 rounded-md border border-[var(--border)] bg-[color-mix(in_srgb,var(--teal)_8%,white)] px-3 py-2 text-sm text-[var(--steel)]">
          POS completo: combina este plan con un kit de equipos.{" "}
          <Link href="/equipos" className="font-medium text-[var(--teal)] underline-offset-2 hover:underline">
            Ver kits y equipos
          </Link>
        </p>
      ) : null}
      <ul className="mt-5 flex-1 space-y-2 text-sm text-[var(--steel)]">
        {plan.highlights.slice(0, 4).map((item) => (
          <li key={item} className="flex gap-2">
            <span aria-hidden className="text-[var(--teal)]">
              ✓
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
      <div className="mt-6 flex flex-wrap gap-2">
        {priced ? (
          <>
            <HireModalTrigger plan={displayPlan} modality={interval} solutionType={solutionMode} />
            <HireModalTrigger
              plan={displayPlan}
              modality={interval}
              solutionType={solutionMode}
              intent="whatsapp"
            />
          </>
        ) : (
          <Link href="/contacto">
            <Button size="sm" variant="outline">
              Consulta comercial
            </Button>
          </Link>
        )}
        <Link
          href={`/planes/${plan.slug}`}
          className="inline-flex items-center px-3 text-sm font-medium text-[var(--teal)] underline-offset-2 hover:underline"
        >
          Ver características
        </Link>
      </div>
    </article>
  );
}

function ComparisonTable({ plans }: { plans: Plan[] }) {
  const featureRows = useMemo(() => {
    const map = new Map<string, { label: string; byPlan: Record<string, PlanFeature | null> }>();
    for (const plan of plans) {
      for (const feature of plan.features ?? []) {
        const existing = map.get(feature.code) ?? { label: feature.label, byPlan: {} };
        existing.byPlan[plan.slug] = feature;
        existing.label = feature.label;
        map.set(feature.code, existing);
      }
    }
    return Array.from(map.entries()).map(([code, row]) => ({ code, ...row }));
  }, [plans]);

  if (featureRows.length === 0) return null;

  return (
    <div className="mt-14 overflow-x-auto rounded-xl border border-[var(--border)] bg-white/70">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-[var(--border)] bg-[var(--navy)] text-[var(--ivory)]">
          <tr>
            <th className="px-4 py-3 font-medium">Qué incluye</th>
            {plans.map((plan) => (
              <th key={plan.slug} className="px-4 py-3 font-medium">
                {plan.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {featureRows.map((row) => (
            <tr key={row.code} className="border-b border-[var(--border)] last:border-0">
              <td className="px-4 py-3 font-medium text-[var(--navy)]">{row.label}</td>
              {plans.map((plan) => {
                const feature = row.byPlan[plan.slug];
                return (
                  <td key={plan.slug} className="px-4 py-3 text-[var(--steel)]">
                    {feature ? featureStatusLabel(feature.commercialStatus) : "No incluido"}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PlanCatalog({
  plans,
  kits,
  initialSolutionMode = "SOFTWARE",
}: {
  plans: Plan[];
  kits: Equipment[];
  initialSolutionMode?: SolutionMode;
}) {
  // Client-side query keeps /planes statically rendered so metadata stays in <head> for crawlers/Lighthouse.
  const searchParams = useSearchParams();
  const fromQuery = searchParams.get("solucion") === "completo" ? "COMPLETE" : null;
  const [solutionMode, setSolutionMode] = useState<SolutionMode>(fromQuery ?? initialSolutionMode);
  const [interval, setInterval] = useState<Exclude<BillingInterval, "PERPETUAL">>("MONTHLY");

  const recurring = plans.filter(
    (p) => p.slug !== "perpetua" && !(p.prices?.PERPETUAL && !p.prices?.MONTHLY && !p.prices?.ANNUAL),
  );
  const perpetual = plans.find(
    (p) => p.slug === "perpetua" || Boolean(p.prices?.PERPETUAL || p.primaryInterval === "PERPETUAL"),
  );

  return (
    <div>
      <div className="flex flex-col gap-6 rounded-xl border border-[var(--border)] bg-white/60 p-5 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <ToggleGroup
          label="Modalidad de solución"
          value={solutionMode}
          onChange={setSolutionMode}
          options={[
            { value: "SOFTWARE", label: "Solo software" },
            { value: "COMPLETE", label: "POS completo" },
          ]}
        />
        <ToggleGroup
          label="Forma de pago"
          value={interval}
          onChange={setInterval}
          options={[
            { value: "MONTHLY", label: "Mensual" },
            { value: "ANNUAL", label: "Anual" },
          ]}
        />
      </div>

      {solutionMode === "COMPLETE" ? (
        <div className="mt-6 rounded-xl border border-[var(--yellow)]/40 bg-[color-mix(in_srgb,var(--yellow)_10%,white)] px-5 py-4">
          <h3 className="font-serif text-xl text-[var(--navy)]">POS completo = software + equipos</h3>
          <p className="mt-2 max-w-3xl text-sm text-[var(--steel)]">
            Mostramos los precios del plan de software. Los kits se cotizan por separado con precios reales del catálogo;
            no inventamos un precio de paquete si no existe en la oferta comercial.
          </p>
          {kits.length > 0 ? (
            <ul className="mt-4 grid gap-3 sm:grid-cols-3">
              {kits.slice(0, 3).map((kit) => (
                <li key={kit.id} className="rounded-lg border border-[var(--border)] bg-white/80 p-3 text-sm">
                  <p className="font-medium text-[var(--navy)]">{kit.name}</p>
                  <p className="mt-1 text-[var(--muted)]">{formatMoney(kit.price)}</p>
                  <Link href={`/equipos/${kit.slug}`} className="mt-2 inline-block text-[var(--teal)] underline-offset-2 hover:underline">
                    Ver kit
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <Link href="/equipos" className="mt-3 inline-block">
              <Button variant="outline" size="sm">
                Ir a equipos y kits
              </Button>
            </Link>
          )}
        </div>
      ) : null}

      <div className="mt-10">
        <h2 className="font-serif text-3xl text-[var(--navy)]">
          Planes {interval === "ANNUAL" ? "anuales" : "mensuales"}
        </h2>
        <p className="mt-2 text-[var(--muted)]">
          Esencial, Profesional y Empresarial — una licencia equivale a una caja.
        </p>
        <div className="mt-6 grid gap-5 lg:grid-cols-3">
          {recurring.map((plan) => (
            <CommercialPlanCard
              key={plan.id}
              plan={plan}
              interval={interval}
              solutionMode={solutionMode}
            />
          ))}
        </div>
        {recurring.length === 0 ? (
          <p className="mt-6 text-[var(--muted)]">No hay planes recurrentes visibles para esta modalidad.</p>
        ) : null}
      </div>

      {perpetual ? (
        <div className="mt-14 border-t border-[var(--border)] pt-10">
          <h2 className="font-serif text-3xl text-[var(--navy)]">Licencia perpetua</h2>
          <p className="mt-2 text-[var(--muted)]">
            Pago único, presentado aparte de los planes mensuales y anuales.
          </p>
          <div className="mt-6 max-w-xl">
            <CommercialPlanCard plan={perpetual} interval="PERPETUAL" solutionMode={solutionMode} />
          </div>
        </div>
      ) : null}

      <div className="mt-14">
        <h2 className="font-serif text-2xl text-[var(--navy)]">Compara lo que incluye cada plan</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Lenguaje comercial: Disponible, En certificación, Próximamente o No incluido.
        </p>
        <ComparisonTable plans={recurring} />
      </div>
    </div>
  );
}
