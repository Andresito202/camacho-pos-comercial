"use client";

import Link from "next/link";
import { Button } from "@camacho-pos/ui";
import { formatMoney } from "@/lib/format";
import { useCart } from "@/lib/cart-store";

export function CartClient() {
  const { items, subtotal, update, remove, clear } = useCart();

  if (items.length === 0) {
    return (
      <div className="border border-dashed border-[var(--border)] p-8 text-center">
        <p className="text-[var(--muted)]">Tu carrito está vacío.</p>
        <div className="mt-4 flex justify-center gap-3">
          <Link href="/planes">
            <Button>Ver planes</Button>
          </Link>
          <Link href="/equipos">
            <Button variant="outline">Ver equipos</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ul className="divide-y divide-[var(--border)] border-y border-[var(--border)]">
        {items.map((item) => (
          <li key={item.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
            <div>
              <p className="font-medium">{item.name}</p>
              <p className="text-xs uppercase tracking-wide text-[var(--muted)]">
                {item.kind} · {item.refId}
              </p>
              <p className="mt-1 text-sm">{formatMoney(item.unitPrice)}</p>
            </div>
            <div className="flex items-center gap-3">
              <label className="text-sm">
                Cant.
                <input
                  type="number"
                  min={1}
                  value={item.quantity}
                  onChange={(event) => update(item.id, Number(event.target.value) || 1)}
                  className="ml-2 w-16 rounded border border-[var(--border)] px-2 py-1"
                />
              </label>
              <Button variant="ghost" size="sm" onClick={() => remove(item.id)}>
                Quitar
              </Button>
            </div>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="font-serif text-2xl">Subtotal: {formatMoney(subtotal)}</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={clear}>
            Vaciar
          </Button>
          <Link href="/checkout">
            <Button>Ir a checkout</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
