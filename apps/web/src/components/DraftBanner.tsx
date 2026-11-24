import type { ApiSource } from "@/lib/types";

export function DraftBanner({ source }: { source: ApiSource }) {
  if (source !== "draft") return null;
  return (
    <div
      className="border-b border-[color-mix(in_srgb,var(--yellow)_45%,transparent)] bg-[color-mix(in_srgb,var(--yellow)_22%,white)] px-4 py-2 text-center text-sm text-[var(--navy)]"
      role="status"
    >
      Vista previa DRAFT: commercial-api no respondió. Contenido etiquetado solo para desarrollo.
    </div>
  );
}
