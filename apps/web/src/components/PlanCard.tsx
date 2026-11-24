import Link from "next/link";
import { formatMoney } from "@/lib/format";
import type { Plan } from "@/lib/types";
import { HireModalTrigger } from "./HireModal";
import { StatusBadge } from "./StatusBadge";

export function PlanCard({ plan }: { plan: Plan }) {
  return (
    <article className="flex h-full flex-col border-t-4 border-[var(--yellow)] bg-white/70 p-6 shadow-[0_1px_0_rgba(16,28,45,0.06)]">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-serif text-2xl text-[var(--navy)]">{plan.name}</h3>
          <p className="mt-2 text-sm text-[var(--muted)]">{plan.tagline}</p>
        </div>
        <StatusBadge status={plan.status} />
      </div>
      <p className="font-serif text-3xl text-[var(--navy)]">
        {formatMoney(plan.priceMonthly)}
        <span className="text-base font-sans text-[var(--muted)]">
          {plan.primaryInterval === "PERPETUAL"
            ? " pago único"
            : plan.primaryInterval === "ANNUAL"
              ? " / año"
              : " / mes"}
        </span>
      </p>
      <ul className="mt-5 flex-1 space-y-2 text-sm text-[var(--steel)]">
        {plan.highlights.map((item) => (
          <li key={item} className="flex gap-2">
            <span aria-hidden className="text-[var(--teal)]">
              ✓
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
      <div className="mt-6 flex flex-wrap gap-2">
        <HireModalTrigger plan={plan} />
        <Link href={`/planes/${plan.slug}`} className="inline-flex items-center px-3 text-sm font-medium underline-offset-2 hover:underline">
          Ver detalle
        </Link>
      </div>
    </article>
  );
}
