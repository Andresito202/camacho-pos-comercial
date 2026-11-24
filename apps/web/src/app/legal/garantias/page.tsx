import { buildMetadata, breadcrumbJsonLd, JsonLd } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Garantías",
  description: "Garantías de Camacho POS Colombia.",
  path: "/legal/garantias",
});

export default function LegalPage() {
  const paragraphs = ["El software incluye actualizaciones de seguridad según el plan vigente.", "El hardware se garantiza según el proveedor homologado y la factura del kit; plazos se confirman en la orden.", "Defectos de instalación atribuibles al canal comercial se atienden sin costo de visita remota inicial."] as string[];
  return (
    <article className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <JsonLd data={breadcrumbJsonLd([{ name: "Inicio", path: "/" }, { name: "Garantías", path: "/legal/garantias" }])} />
      <h1 className="font-serif text-4xl">Garantías</h1>
      <div className="mt-8 space-y-4 text-[var(--steel)]">
        {paragraphs.map((p) => <p key={p}>{p}</p>)}
      </div>
    </article>
  );
}
