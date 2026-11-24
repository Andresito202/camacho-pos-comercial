"use client";

import { useEffect, useState } from "react";
import { WhatsAppFloat } from "@camacho-pos/ui";
import { getDefaultWhatsAppNumber } from "@/lib/env";

export function WhatsAppLauncher({
  number,
  preset,
}: {
  number?: string;
  preset?: string;
}) {
  const [href, setHref] = useState("");

  useEffect(() => {
    const n = number || getDefaultWhatsAppNumber();
    const message =
      preset ||
      "Hola, quiero información comercial de Camacho POS Colombia.";
    setHref(`https://wa.me/${n}?text=${encodeURIComponent(message)}`);
  }, [number, preset]);

  return <WhatsAppFloat href={href} label="WhatsApp comercial" />;
}
