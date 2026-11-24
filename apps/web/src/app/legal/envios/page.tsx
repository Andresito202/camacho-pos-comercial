import { buildMetadata, breadcrumbJsonLd, JsonLd } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Envíos",
  description: "Envíos de Camacho POS Colombia.",
  path: "/legal/envios",
});

export default function LegalPage() {
  const paragraphs = ["Los equipos se despachan a ciudades con cobertura publicada. El lead time es orientativo y se confirma al pagar.", "La instalación remota del software puede iniciar antes de la llegada física del hardware.", "Costos de flete se calculan en checkout según ciudad y peso volumétrico del kit."] as string[];
  return (
    <article className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <JsonLd data={breadcrumbJsonLd([{ name: "Inicio", path: "/" }, { name: "Envíos", path: "/legal/envios" }])} />
      <h1 className="font-serif text-4xl">Envíos</h1>
      <div className="mt-8 space-y-4 text-[var(--steel)]">
        {paragraphs.map((p) => <p key={p}>{p}</p>)}
      </div>
    </article>
  );
}
