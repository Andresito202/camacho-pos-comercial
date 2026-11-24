import { buildMetadata, breadcrumbJsonLd, JsonLd } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Política de cookies",
  description: "Política de cookies de Camacho POS Colombia.",
  path: "/legal/cookies",
});

export default function LegalPage() {
  const paragraphs = ["Usamos cookies técnicas necesarias para sesión, carrito local y seguridad.", "Las cookies analíticas, si se habilitan, se documentarán con consentimiento previo.", "Puedes configurar tu navegador para bloquear cookies no esenciales; el carrito y el login pueden verse afectados."] as string[];
  return (
    <article className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <JsonLd data={breadcrumbJsonLd([{ name: "Inicio", path: "/" }, { name: "Política de cookies", path: "/legal/cookies" }])} />
      <h1 className="font-serif text-4xl">Política de cookies</h1>
      <div className="mt-8 space-y-4 text-[var(--steel)]">
        {paragraphs.map((p) => <p key={p}>{p}</p>)}
      </div>
    </article>
  );
}
