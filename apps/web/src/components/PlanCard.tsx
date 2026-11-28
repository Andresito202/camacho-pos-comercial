import Link from "next/link";
import { formatMoney } from "@/lib/format";
import type { Plan } from "@/lib/types";
import { HireModalTrigger } from "./HireModal";
import { StatusBadge } from "./StatusBadge";

export function PlanCard({ plan }: { plan: Plan }) {
  return (
    <article className="surface-card flex h-full min-w-0 flex-col border-t-4 border-[var(--yellow)] p-6">
      <div className="mb-4 flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-2xl font-bold text-[var(--navy)]">{plan.name}</h3>
          <p className="mt-2 text-sm text-[var(--muted)]">{plan.tagline}</p>
        </div>
        <div className="shrink-0">
          <StatusBadge status={plan.status} />
        </div>
      </div>
      <p className="text-3xl font-bold text-[var(--navy)]">
        {formatMoney(plan.priceMonthly)}
        <span className="text-base font-normal text-[var(--muted)]">
          {plan.primaryInterval === "PERPETUAL"
            ? " pago único"
            : plan.primaryInterval === "ANNUAL"
              ? " / año"
              : " / mes"}
        </span>
      </p>
      <ul className="mt-5 flex-1 space-y-2 text-sm text-[var(--steel)]">
        {plan.highlights.map((item) => (
          <li key={item} className="flex min-w-0 gap-2">
            <span aria-hidden className="shrink-0 text-[var(--teal)]">
              ✓
            </span>
            <span className="min-w-0 break-words">{item}</span>
          </li>
        ))}
      </ul>
      <div className="cta-row mt-6">
        <HireModalTrigger
          plan={plan}
          modality={plan.primaryInterval === "ANNUAL" || plan.primaryInterval === "PERPETUAL" ? plan.primaryInterval : "MONTHLY"}
        />
        <Link href={`/planes/${plan.slug}`} className="inline-flex min-h-11 items-center px-3 text-sm font-semibold underline-offset-2 hover:underline">
          Ver características
        </Link>
      </div>
    </article>
  );
}
