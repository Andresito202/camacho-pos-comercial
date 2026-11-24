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
  const draftPreview = plan.status === "borrador";
  const canOpen = sellable || draftPreview;

  return (
    <>
      <Button
        size="sm"
        disabled={!canOpen}
        title={
          canOpen
            ? draftPreview
              ? "Vista borrador: sin cobro real hasta publicar precios"
              : undefined
            : "Este plan aún no está disponible para contratación"
        }
        onClick={() => setOpen(true)}
      >
        {draftPreview ? "Ver contratación" : "Contratar"}
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`${draftPreview ? "Vista borrador · " : ""}Contratar ${plan.name}`}
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
            <Link href={`/contacto?plan=${plan.slug}`}>
              <Button variant="outline">Solicitar asesoría</Button>
            </Link>
          </div>
        }
      >
        {draftPreview ? (
          <p className="mb-3 rounded-md border border-[var(--yellow)]/40 bg-[color-mix(in_srgb,var(--yellow)_12%,white)] px-3 py-2 text-xs text-[var(--navy)]">
            Precio provisional en borrador. El backend rechaza cobros reales hasta publicar el plan y habilitar FACTUS Pay certificado.
          </p>
        ) : null}
        <p className="text-sm text-[var(--muted)]">{plan.tagline}</p>
        <p className="mt-4 font-serif text-2xl">
          {formatMoney(plan.priceMonthly)}
          {plan.primaryInterval === "PERPETUAL"
            ? " pago único"
            : plan.primaryInterval === "ANNUAL"
              ? " / año"
              : " / mes"}
        </p>
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
