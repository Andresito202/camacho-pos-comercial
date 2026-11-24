import { buildMetadata, breadcrumbJsonLd, JsonLd } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Devoluciones",
  description: "Devoluciones de Camacho POS Colombia.",
  path: "/legal/devoluciones",
});

export default function LegalPage() {
  const paragraphs = ["Software: no hay devolución de licencia activada salvo defecto imputable demostrado en los primeros 15 días.", "Hardware: se acepta devolución por defecto de fábrica según política del proveedor, con embalaje original.", "Solicitudes a devoluciones@camachoposcolombia.com con número de pedido y evidencia."] as string[];
  return (
    <article className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <JsonLd data={breadcrumbJsonLd([{ name: "Inicio", path: "/" }, { name: "Devoluciones", path: "/legal/devoluciones" }])} />
      <h1 className="font-serif text-4xl">Devoluciones</h1>
      <div className="mt-8 space-y-4 text-[var(--steel)]">
        {paragraphs.map((p) => <p key={p}>{p}</p>)}
      </div>
    </article>
  );
}
