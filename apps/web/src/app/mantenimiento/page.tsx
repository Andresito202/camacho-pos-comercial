import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Mantenimiento",
  description: "Estado de mantenimiento del sitio comercial Camacho POS Colombia.",
  path: "/mantenimiento",
  noIndex: true,
});

export default function MantenimientoPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center sm:px-6">
      <h1 className="font-serif text-4xl">Mantenimiento programado</h1>
      <p className="mt-4 text-[var(--muted)]">
        Cuando el API marca maintenanceMode, el sitio público muestra este aviso. Ventas urgentes: WhatsApp comercial o
        soporte@camachoposcolombia.com.
      </p>
    </div>
  );
}
