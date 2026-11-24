import { buildMetadata } from "@/lib/seo";
import { TrialStatusClient } from "./TrialStatusClient";

export const metadata = buildMetadata({
  title: "Estado de la prueba 5 días",
  description: "Consulta el estado, vencimiento y bloqueo de tu prueba comercial Camacho POS Colombia.",
  path: "/prueba-5-dias/estado",
});

export default async function TrialStatusPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TrialStatusClient id={id} />;
}
