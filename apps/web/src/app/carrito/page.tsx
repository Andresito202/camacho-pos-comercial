import { buildMetadata } from "@/lib/seo";
import { CartClient } from "./CartClient";

export const metadata = buildMetadata({
  title: "Carrito",
  description: "Revisa planes y equipos antes de contratar Camacho POS Colombia.",
  path: "/carrito",
  noIndex: true,
});

export default function CarritoPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <h1 className="font-serif text-4xl">Carrito</h1>
      <p className="mt-3 text-[var(--muted)]">
        Solo ítems con estado Disponible deben avanzar a checkout. El subtotal se calcula en COP.
      </p>
      <div className="mt-8">
        <CartClient />
      </div>
    </div>
  );
}
