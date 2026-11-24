"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, Modal } from "@camacho-pos/ui";
import { addCartItem } from "@/lib/cart-store";
import { formatMoney, isPubliclySellable } from "@/lib/format";
import type { Plan } from "@/lib/types";

export function HireModalTrigger({ plan }: { plan: Plan }) {
  const [open, setOpen] = useState(false);
  const sellable = isPubliclySellable(plan.status);

  return (
    <>
      <Button
        size="sm"
        disabled={!sellable}
        title={sellable ? undefined : "Este plan aún no está disponible para contratación"}
        onClick={() => setOpen(true)}
      >
        Contratar
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`Contratar ${plan.name}`}
        footer={
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => {
                addCartItem({
                  id: `plan-${plan.planPriceId ?? plan.id}`,
                  kind: "plan",
                  refId: plan.planPriceId ?? plan.id,
                  slug: plan.slug,
                  name: plan.name,
                  unitPrice: plan.priceMonthly,
                  ...(plan.planPriceId ? { planPriceId: plan.planPriceId } : {}),
                  ...(plan.priceVersion != null ? { priceVersion: plan.priceVersion } : {}),
                });
                setOpen(false);
              }}
            >
              Agregar al carrito
            </Button>
            <Link href={`/contratar?plan=${plan.slug}`}>
              <Button variant="secondary">Ir a contratar</Button>
            </Link>
          </div>
        }
      >
        <p className="text-sm text-[var(--muted)]">{plan.tagline}</p>
        <p className="mt-4 font-serif text-2xl">{formatMoney(plan.priceMonthly)} / mes</p>
        <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-[var(--steel)]">
          {plan.highlights.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-[var(--muted)]">Plan id: {plan.id}</p>
      </Modal>
    </>
  );
}
