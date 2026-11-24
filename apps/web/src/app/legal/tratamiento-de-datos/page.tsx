import { buildMetadata, breadcrumbJsonLd, JsonLd } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Tratamiento de datos personales",
  description: "Tratamiento de datos personales de Camacho POS Colombia.",
  path: "/legal/tratamiento-de-datos",
});

export default function LegalPage() {
  const paragraphs = ["Responsable: Camacho POS Colombia. Finalidades: gestión comercial, facturación, soporte y cumplimiento legal.", "Bases de legitimación: ejecución contractual, obligación legal e interés legítimo en seguridad del servicio.", "Conservación: mientras dure la relación comercial y los plazos legales de auditoría fiscal y seguridad.", "Transferencias internacionales solo con cláusulas adecuadas y proveedores identificados en el contrato."] as string[];
  return (
    <article className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <JsonLd data={breadcrumbJsonLd([{ name: "Inicio", path: "/" }, { name: "Tratamiento de datos personales", path: "/legal/tratamiento-de-datos" }])} />
      <h1 className="font-serif text-4xl">Tratamiento de datos personales</h1>
      <div className="mt-8 space-y-4 text-[var(--steel)]">
        {paragraphs.map((p) => <p key={p}>{p}</p>)}
      </div>
    </article>
  );
}
