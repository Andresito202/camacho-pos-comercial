"use client";

import { Button } from "@camacho-pos/ui";
import { addCartItem } from "@/lib/cart-store";
import type { Equipment } from "@/lib/types";

export function AddEquipmentButton({ item }: { item: Equipment }) {
  return (
    <Button
      size="sm"
      onClick={() =>
        addCartItem({
          id: `eq-${item.id}`,
          kind: "equipment",
          refId: item.id,
          slug: item.slug,
          name: item.name,
          unitPrice: item.price,
        })
      }
    >
      Agregar
    </Button>
  );
}
