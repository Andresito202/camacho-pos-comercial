import Link from "next/link";
import { Button } from "@camacho-pos/ui";
import { getCheckoutStatus } from "@/lib/api";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Estado del checkout",
  description: "Consulta el estado de tu pago o contratación Camacho POS Colombia.",
  path: "/checkout/estado",
  noIndex: true,
});

type Props = { searchParams: Promise<{ id?: string }> };

export default async function CheckoutStatusPage({ searchParams }: Props) {
  const { id } = await searchParams;
  const result = id ? await getCheckoutStatus(id) : null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
      <h1 className="font-serif text-4xl">Estado del checkout</h1>
      {!id ? (
        <p className="mt-4 text-[var(--muted)]">Falta el identificador de checkout en la URL.</p>
      ) : !result ? (
        <p className="mt-4 text-[var(--muted)]">
          No encontramos el checkout <code>{id}</code>. Si acabas de pagar, espera unos segundos o contacta soporte.
        </p>
      ) : (
        <div className="mt-6 space-y-3 bg-white/70 p-6">
          <p>
            <span className="text-sm text-[var(--muted)]">ID</span>
            <br />
            <code>{result.data.id}</code>
          </p>
          <p>
            <span className="text-sm text-[var(--muted)]">Estado</span>
            <br />
            <span className="font-serif text-3xl capitalize">{result.data.status}</span>
          </p>
          <p className="text-sm text-[var(--muted)]">Fuente: {result.source}</p>
          {result.data.status === "pagado" ? (
            <p className="text-[var(--steel)]">
              Siguiente paso: revisa <Link href="/descargas" className="underline">Descargas</Link> para instalar la app en
              Windows o Android. Los cajeros no operan en esta web.
            </p>
          ) : (
            <p className="text-[var(--steel)]">
              El pago sigue en proceso. Conserva este ID para soporte comercial.
            </p>
          )}
        </div>
      )}
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/soporte">
          <Button variant="outline">Soporte</Button>
        </Link>
        <Link href="/descargas">
          <Button>Descargas</Button>
        </Link>
      </div>
    </div>
  );
}
