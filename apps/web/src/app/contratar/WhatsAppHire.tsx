"use client";

import { useState } from "react";
import { Button } from "@camacho-pos/ui";
import { buildWhatsAppMessage } from "@/lib/api";

export function WhatsAppHire({ planId, city }: { planId: string; city?: string }) {
  const [pending, setPending] = useState(false);

  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        try {
          const result = await buildWhatsAppMessage({
            intent: "contratar",
            planId,
            city,
          });
          window.open(result.url, "_blank", "noopener,noreferrer");
        } finally {
          setPending(false);
        }
      }}
    >
      {pending ? "Armando mensaje…" : "WhatsApp con este plan"}
    </Button>
  );
}
