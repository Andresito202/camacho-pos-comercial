import { Accordion } from "@camacho-pos/ui";
import { getFaq } from "@/lib/api";
import { buildMetadata, faqJsonLd, JsonLd } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Preguntas frecuentes",
  description: "FAQ de Camacho POS Colombia: local-first, roles, facturación, instalación y pagos.",
  path: "/preguntas-frecuentes",
});

export default async function FaqPage() {
  const faq = await getFaq();
  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <JsonLd data={faqJsonLd(faq.data.map((i) => ({ question: i.question, answer: i.answer })))} />
      <h1 className="font-serif text-4xl">Preguntas frecuentes</h1>
      <p className="mt-3 text-[var(--muted)]">Respuestas oficiales del producto comercial. Sin relleno.</p>
      <div className="mt-8">
        <Accordion items={faq.data.map((item) => ({ id: item.id, title: item.question, content: <p>{item.answer}</p> }))} />
      </div>
    </div>
  );
}
