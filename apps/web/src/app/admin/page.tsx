import Link from "next/link";
import { cookies } from "next/headers";
import { adminFetch } from "@/lib/api";
import { ADMIN_TOKEN_COOKIE } from "@/lib/auth";

export default async function AdminDashboardPage() {
  const token = (await cookies()).get(ADMIN_TOKEN_COOKIE)?.value;
  const [plans, orders, payments, clientes, promos, tickets] = await Promise.all([
    adminFetch<unknown[]>("/v1/admin/catalog/plans", token),
    adminFetch<unknown[]>("/v1/admin/pedidos", token),
    adminFetch<unknown[]>("/v1/admin/pagos", token),
    adminFetch<{ contacts?: unknown[]; leads?: unknown[]; demos?: unknown[] }>(
      "/v1/admin/clientes",
      token,
    ),
    adminFetch<unknown[]>("/v1/admin/promociones", token),
    adminFetch<unknown[]>("/v1/admin/tickets", token),
  ]);

  const cards = [
    { href: "/admin/planes", label: "Planes", count: plans?.length ?? 0 },
    { href: "/admin/pedidos", label: "Pedidos", count: orders?.length ?? 0 },
    { href: "/admin/pagos", label: "Pagos", count: payments?.length ?? 0 },
    {
      href: "/admin/clientes",
      label: "Solicitudes",
      count:
        (clientes?.contacts?.length ?? 0) +
        (clientes?.leads?.length ?? 0) +
        (clientes?.demos?.length ?? 0),
    },
    { href: "/admin/promociones", label: "Promociones", count: promos?.length ?? 0 },
    { href: "/admin/tickets", label: "Tickets", count: tickets?.length ?? 0 },
  ];

  return (
    <div>
      <h1 className="font-serif text-3xl">Dashboard</h1>
      <p className="mt-2 text-[var(--muted)]">
        Resumen desde endpoints admin reales (fail-closed sin Central, salvo fixture de prueba).
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="border border-[var(--border)] bg-white/70 p-5 hover:border-[var(--teal)]"
          >
            <p className="text-xs uppercase tracking-[0.14em] text-[var(--teal)]">{card.label}</p>
            <p className="mt-2 font-serif text-3xl">{card.count}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
