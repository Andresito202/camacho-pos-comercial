import { Inject, Injectable } from "@nestjs/common";
import type { WhatsAppCatalogMessageInput } from "@camacho-pos-comercial/contracts";
import { AppConfigService } from "../../config/config.service.js";

function modalityLabel(modality?: string) {
  if (modality === "ANNUAL") return "Anual";
  if (modality === "PERPETUAL") return "Pago único";
  if (modality === "MONTHLY") return "Mensual";
  return null;
}

@Injectable()
export class WhatsappService {
  constructor(@Inject(AppConfigService) private readonly config: AppConfigService) {}

  buildCatalogMessage(input: WhatsAppCatalogMessageInput) {
    const number = this.config.env.WHATSAPP_BUSINESS_NUMBER;
    const isPlaceholder = number.includes("DEV_PLACEHOLDER");

    // No PII in URL — only public catalog references.
    const parts: string[] = ["Hola, me interesa Camacho POS."];
    if (input.planSlug) parts.push(`Plan: ${input.planSlug}`);
    if (input.planId) parts.push(`Id: ${input.planId}`);
    const modality = modalityLabel(input.modality);
    if (modality) parts.push(`Modalidad: ${modality}`);
    if (input.priceLabel) parts.push(`Precio: ${input.priceLabel}`);
    if (input.kitSlug) parts.push(`Kit: ${input.kitSlug}`);
    if (input.productSku) parts.push(`SKU: ${input.productSku}`);
    if (input.utmSource) parts.push(`ref:${input.utmSource}`);

    const text = parts.join(" ");
    const phone = number.replace(/_DEV_PLACEHOLDER$/, "").replace(/\D/g, "");
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;

    return {
      url,
      text,
      phoneMarkedDevPlaceholder: isPlaceholder,
      warning: isPlaceholder
        ? "WHATSAPP_BUSINESS_NUMBER is a DEV PLACEHOLDER — replace before production messaging"
        : null,
    };
  }
}
