"use client";

import { useMemo, useState } from "react";
import { Button } from "@camacho-pos/ui";
import { formatMoney, isCatalogVisible } from "@/lib/format";
import type { Equipment } from "@/lib/types";
import { addCartItem } from "@/lib/cart-store";
import { EquipmentCard } from "./EquipmentCard";
import { StatusBadge } from "./StatusBadge";

export function EquiposCatalog({ items }: { items: Equipment[] }) {
  const visible = items.filter((item) => isCatalogVisible(item.status));
  const categories = useMemo(() => {
    const set = new Set(visible.map((item) => item.category));
    return ["Todas", ...Array.from(set).sort()];
  }, [visible]);

  const [category, setCategory] = useState("Todas");
  const [compareIds, setCompareIds] = useState<string[]>([]);

  const filtered =
    category === "Todas" ? visible : visible.filter((item) => item.category === category);

  function toggleCompare(id: string) {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  }

  const compared = visible.filter((item) => compareIds.includes(item.id));

  function addComparedToCart() {
    for (const item of compared) {
      if (!item.productVariantId && !item.kitId) continue;
      addCartItem({
        id: `eq-${item.productVariantId ?? item.kitId ?? item.id}`,
        kind: "equipment",
        refId: item.productVariantId ?? item.kitId ?? item.id,
        slug: item.slug,
        name: item.name,
        unitPrice: item.price,
        ...(item.productVariantId ? { productVariantId: item.productVariantId } : {}),
        ...(item.kitId ? { kitId: item.kitId } : {}),
        ...(item.priceVersion != null ? { priceVersion: item.priceVersion } : {}),
      });
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por categoría">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategory(cat)}
            className={`border px-3 py-1.5 text-sm ${
              category === cat
                ? "border-[var(--teal)] bg-[var(--teal)] text-white"
                : "border-[var(--border)] bg-white/70"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <p className="text-sm text-[var(--muted)]">
        Las imágenes son ilustraciones referenciales, no fotos de modelos reales. Compara hasta 3 equipos.
        {compareIds.length ? ` Seleccionados: ${compareIds.length}` : ""}
      </p>

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((item) => (
          <div key={item.id} className="relative">
            <label className="absolute right-3 top-3 z-10 flex items-center gap-2 bg-white/90 px-2 py-1 text-xs">
              <input
                type="checkbox"
                checked={compareIds.includes(item.id)}
                onChange={() => toggleCompare(item.id)}
                disabled={!compareIds.includes(item.id) && compareIds.length >= 3}
              />
              Comparar
            </label>
            <EquipmentCard item={item} allowDraftCart />
          </div>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-[var(--muted)]">No hay equipos en esta categoría.</p>
      ) : null}

      {compared.length >= 2 ? (
        <section className="overflow-x-auto border border-[var(--border)] bg-white/80 p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-serif text-2xl">Comparación</h2>
            <Button size="sm" onClick={addComparedToCart}>
              Agregar seleccionados al carrito
            </Button>
          </div>
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="py-2 pr-4">Atributo</th>
                {compared.map((item) => (
                  <th key={item.id} className="py-2 pr-4 font-serif text-base">
                    {item.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-[var(--border)]">
                <td className="py-2 pr-4 text-[var(--muted)]">Categoría</td>
                {compared.map((item) => (
                  <td key={item.id} className="py-2 pr-4">
                    {item.category}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-[var(--border)]">
                <td className="py-2 pr-4 text-[var(--muted)]">Precio</td>
                {compared.map((item) => (
                  <td key={item.id} className="py-2 pr-4">
                    {formatMoney(item.price)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-2 pr-4 text-[var(--muted)]">Estado</td>
                {compared.map((item) => (
                  <td key={item.id} className="py-2 pr-4">
                    <StatusBadge status={item.status} />
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </section>
      ) : null}
    </div>
  );
}
