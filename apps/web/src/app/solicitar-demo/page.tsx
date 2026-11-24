import { buildMetadata } from "@/lib/seo";
import { DemoForm } from "./DemoForm";

export const metadata = buildMetadata({
  title: "Solicitar demo",
  description: "Agenda una demostración guiada de Camacho POS Colombia para tu sector.",
  path: "/solicitar-demo",
});

export default function SolicitarDemoPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
      <h1 className="font-serif text-4xl">Solicitar demo</h1>
      <p className="mt-3 text-[var(--muted)]">
        Un asesor comercial revisa tu sector y el kit recomendado. La demo no habilita caja web: se muestra el flujo Electron/Android.
      </p>
      <div className="mt-8"><DemoForm /></div>
    </div>
  );
}
