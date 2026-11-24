import Image from "next/image";
import Link from "next/link";
import { Button } from "@camacho-pos/ui";
import { formatMoney, isPubliclySellable } from "@/lib/format";
import type { Equipment } from "@/lib/types";
import { AddEquipmentButton } from "./AddEquipmentButton";
import { StatusBadge } from "./StatusBadge";

export function EquipmentCard({
  item,
  allowDraftCart = false,
}: {
  item: Equipment;
  /** Staging: allow cart composition for borrador when variant/kit ids exist (checkout still rejects DRAFT). */
  allowDraftCart?: boolean;
}) {
  const canAdd =
    isPubliclySellable(item.status) ||
    (allowDraftCart &&
      item.status === "borrador" &&
      Boolean(item.productVariantId || item.kitId));

  return (
    <article className="flex h-full flex-col overflow-hidden bg-white/70 shadow-[0_1px_0_rgba(16,28,45,0.06)]">
      <div className="relative aspect-[16/10] bg-[var(--ivory)]">
        <Image
          src={item.image}
          alt={`${item.name} — ilustración SVG`}
          fill
          className="object-contain p-4"
          sizes="(max-width:768px) 100vw, 33vw"
        />
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-[var(--teal)]">{item.category}</p>
            <h3 className="mt-1 font-serif text-xl">{item.name}</h3>
          </div>
          <StatusBadge status={item.status} />
        </div>
        <p className="text-sm text-[var(--muted)]">{item.summary}</p>
        <p className="mt-4 font-serif text-2xl">{formatMoney(item.price)}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          {canAdd ? <AddEquipmentButton item={item} /> : (
            <Button size="sm" disabled>
              No disponible
            </Button>
          )}
          <Link href={`/equipos/${item.slug}`} className="inline-flex items-center px-3 text-sm font-medium underline-offset-2 hover:underline">
            Detalle
          </Link>
        </div>
      </div>
    </article>
  );
}
