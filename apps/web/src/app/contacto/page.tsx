import { buildMetadata } from "@/lib/seo";
import { ContactForm } from "./ContactForm";

export const metadata = buildMetadata({
  title: "Contacto",
  description: "Contacta al equipo comercial de Camacho POS Colombia.",
  path: "/contacto",
});

export default function ContactoPage() {
  return (
    <div className="mx-auto grid max-w-5xl gap-10 px-4 py-14 lg:grid-cols-2 sm:px-6">
      <div>
        <h1 className="font-serif text-4xl">Contacto comercial</h1>
        <p className="mt-4 text-[var(--muted)]">
          Ventas, cobertura, pedidos y soporte de primer nivel. Para incidentes de operación de caja usa el canal de tu plan.
        </p>
        <dl className="mt-8 space-y-4 text-sm">
          <div><dt className="font-semibold">Correo</dt><dd>ventas@camachoposcolombia.com</dd></div>
          <div><dt className="font-semibold">Soporte</dt><dd>soporte@camachoposcolombia.com</dd></div>
          <div><dt className="font-semibold">Horario</dt><dd>Lunes a viernes, 8:00–18:00 (COT)</dd></div>
        </dl>
      </div>
      <ContactForm />
    </div>
  );
}
