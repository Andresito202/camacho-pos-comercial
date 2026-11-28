import { buildMetadata, breadcrumbJsonLd, JsonLd } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Términos y condiciones",
  description: "Términos y condiciones de Camacho POS Colombia.",
  path: "/legal/terminos",
});

export default function LegalPage() {
  const paragraphs = ["La contratación de planes y equipos se rige por la orden aceptada, estos términos y la legislación colombiana aplicable.", "Las capacidades publicadas con estado distinto de Disponible no forman parte exigible del servicio hasta su habilitación.", "El software de caja se entrega para instalación en Windows o Android según el kit; no se ofrece POS web para cajero.", "El incumplimiento de licencias, hardware no autorizado o uso fuera del negocio contratado puede suspender el servicio."] as string[];
  return (
    <article className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <JsonLd data={breadcrumbJsonLd([{ name: "Inicio", path: "/" }, { name: "Términos y condiciones", path: "/legal/terminos" }])} />
      <h1 className="font-serif text-4xl">Términos y condiciones</h1>
      <div className="mt-8 space-y-4 text-[var(--steel)]">
        {paragraphs.map((p) => <p key={p}>{p}</p>)}
      </div>
    </article>
  );
}
