import { buildMetadata } from "@/lib/seo";
import { CheckoutClient } from "./CheckoutClient";

export const metadata = buildMetadata({
  title: "Checkout",
  description: "Completa tu contratación de Camacho POS Colombia.",
  path: "/checkout",
  noIndex: true,
});

export default function CheckoutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <h1 className="font-serif text-4xl">Checkout</h1>
      <p className="mt-3 text-[var(--muted)]">
        Los datos se envían a commercial-api. Si el API no está disponible en desarrollo, se crea un checkout DRAFT pendiente.
      </p>
      <div className="mt-8">
        <CheckoutClient />
      </div>
    </div>
  );
}
