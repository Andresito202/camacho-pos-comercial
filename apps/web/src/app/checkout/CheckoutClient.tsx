"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Input, TextArea } from "@camacho-pos/ui";
import { createCheckout } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import { clearCart, useCart } from "@/lib/cart-store";

export function CheckoutClient() {
  const { items, subtotal } = useCart();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (items.length === 0) {
    return (
      <div className="border border-dashed border-[var(--border)] p-8 text-center">
        <p className="text-[var(--muted)]">No hay ítems para pagar.</p>
        <Link href="/carrito" className="mt-4 inline-block text-[var(--teal)] underline">
          Volver al carrito
        </Link>
      </div>
    );
  }

  return (
    <form
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        setError(null);
        const form = new FormData(event.currentTarget as HTMLFormElement);
        const customer = Object.fromEntries(
          ["businessName", "nit", "email", "phone", "city", "notes"].map((key) => [
            key,
            String(form.get(key) ?? ""),
          ]),
        );
        const result = await createCheckout({ items, customer });
        setPending(false);
        if (!result) {
          setError("No se pudo crear el checkout. Verifica que commercial-api esté en marcha.");
          return;
        }
        clearCart();
        router.push(`/checkout/estado?id=${encodeURIComponent(result.id)}`);
      }}
    >
      <Input label="Razón social / nombre comercial" name="businessName" required />
      <Input label="NIT" name="nit" required />
      <Input label="Correo" name="email" type="email" required />
      <Input label="Teléfono" name="phone" required />
      <Input label="Ciudad" name="city" required />
      <TextArea label="Notas" name="notes" hint="Horario de contacto, sector o referencias de envío." />
      <p className="font-serif text-2xl">Total estimado: {formatMoney(subtotal)}</p>
      {error ? (
        <p className="text-sm text-[var(--danger)]" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Procesando…" : "Confirmar contratación"}
      </Button>
    </form>
  );
}
