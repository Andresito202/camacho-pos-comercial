import type { FeatureStatus, Money } from "./types";

export function formatMoney(money: Money): string {
  // Commercial DB stores COP integer pesos in `amountCents` (1 unit = 1 COP peso).
  // Do not divide by 100 — that would display $499 instead of $49.900.
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: money.currency,
    maximumFractionDigits: 0,
  }).format(money.amountCents);
}

export function featureStatusLabel(status: FeatureStatus): string {
  switch (status) {
    case "disponible":
      return "Disponible";
    case "en_certificacion":
      return "En certificación";
    case "proximamente":
      return "Próximamente";
    case "borrador":
      return "Precio de referencia";
    case "no_publicada":
      return "Pendiente de publicación";
  }
}

export function featureStatusTone(
  status: FeatureStatus,
): "teal" | "yellow" | "muted" | "steel" {
  switch (status) {
    case "disponible":
      return "teal";
    case "en_certificacion":
      return "yellow";
    case "proximamente":
      return "steel";
    case "borrador":
      return "yellow";
    case "no_publicada":
      return "muted";
  }
}

export function isPubliclySellable(status: FeatureStatus): boolean {
  return status === "disponible";
}

/** Visible in the storefront (including provisional DRAFT catalog in development). */
export function isCatalogVisible(status: FeatureStatus): boolean {
  return status !== "no_publicada";
}
