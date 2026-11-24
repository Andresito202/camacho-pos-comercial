import type { FeatureStatus, Money } from "./types";

export function formatMoney(money: Money): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: money.currency,
    maximumFractionDigits: 0,
  }).format(money.amountCents / 100);
}

export function featureStatusLabel(status: FeatureStatus): string {
  switch (status) {
    case "disponible":
      return "Disponible";
    case "en_certificacion":
      return "En certificación";
    case "proximamente":
      return "Próximamente";
    case "no_publicada":
      return "No publicada";
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
    case "no_publicada":
      return "muted";
  }
}

export function isPubliclySellable(status: FeatureStatus): boolean {
  return status === "disponible";
}
