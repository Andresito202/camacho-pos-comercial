import { buildMetadata, breadcrumbJsonLd, JsonLd } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Política de privacidad",
  description: "Política de privacidad de Camacho POS Colombia.",
  path: "/legal/privacidad",
});

export default function LegalPage() {
  const paragraphs = ["Camacho POS Colombia trata datos personales conforme a la Ley 1581 de 2012 y normas complementarias en Colombia.", "Recopilamos datos de contacto comercial, datos de facturación y registros técnicos necesarios para prestar el servicio contratado.", "No vendemos bases de datos. Los encargados (pasarela de pago, hosting, mensajería) se vinculan por contrato y finalidad específica.", "Puedes ejercer acceso, actualización, rectificación y supresión escribiendo a privacidad@camachoposcolombia.com."] as string[];
  return (
    <article className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <JsonLd data={breadcrumbJsonLd([{ name: "Inicio", path: "/" }, { name: "Política de privacidad", path: "/legal/privacidad" }])} />
      <h1 className="font-serif text-4xl">Política de privacidad</h1>
      <div className="mt-8 space-y-4 text-[var(--steel)]">
        {paragraphs.map((p) => <p key={p}>{p}</p>)}
      </div>
    </article>
  );
}
