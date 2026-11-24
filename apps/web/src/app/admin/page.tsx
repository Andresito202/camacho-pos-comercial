import Link from "next/link";
import { cookies } from "next/headers";
import { AdminEmptyState } from "@/components/admin/AdminClientForms";
import { adminFetch } from "@/lib/api";
import { ADMIN_TOKEN_COOKIE } from "@/lib/auth";

type FetchState<T> = { ok: true; data: T } | { ok: false };

async function loadAdmin<T>(path: string, token?: string): Promise<FetchState<T>> {
  const data = await adminFetch<T>(path, token);
  if (data == null) return { ok: false };
  return { ok: true, data };
}

export default async function AdminDashboardPage() {
  const token = (await cookies()).get(ADMIN_TOKEN_COOKIE)?.value;
  const [plans, orders, payments, clientes, promos, tickets] = await Promise.all([
    loadAdmin<unknown[]>("/v1/admin/catalog/plans", token),
    loadAdmin<unknown[]>("/v1/admin/pedidos", token),
    loadAdmin<unknown[]>("/v1/admin/pagos", token),
    loadAdmin<{ contacts?: unknown[]; leads?: unknown[]; demos?: unknown[] }>(
      "/v1/admin/clientes",
      token,
    ),
    loadAdmin<unknown[]>("/v1/admin/promociones", token),
    loadAdmin<unknown[]>("/v1/admin/tickets", token),
  ]);

  const apiReachable = [plans, orders, payments, clientes, promos, tickets].some((r) => r.ok);

  const cards = [
    {
      href: "/admin/planes",
      label: "Planes",
      count: plans.ok ? plans.data.length : null,
    },
    {
      href: "/admin/pedidos",
      label: "Pedidos",
      count: orders.ok ? orders.data.length : null,
    },
    {
      href: "/admin/pagos",
      label: "Pagos",
      count: payments.ok ? payments.data.length : null,
    },
    {
      href: "/admin/clientes",
      label: "Solicitudes",
      count: clientes.ok
        ? (clientes.data.contacts?.length ?? 0) +
          (clientes.data.leads?.length ?? 0) +
          (clientes.data.demos?.length ?? 0)
        : null,
    },
    {
      href: "/admin/promociones",
      label: "Promociones",
      count: promos.ok ? promos.data.length : null,
    },
    {
      href: "/admin/tickets",
      label: "Tickets",
      count: tickets.ok ? tickets.data.length : null,
    },
  ];

  const allEmpty =
    apiReachable &&
    cards.every((card) => card.count === 0);

  return (
    <div>
      <h1 className="font-serif text-3xl">Dashboard</h1>
      <p className="mt-2 text-[var(--muted)]">
        Resumen desde endpoints admin reales (fail-closed sin Central, salvo fixture de prueba).
        Sin estadísticas inventadas.
      </p>

      {!apiReachable ? (
        <div className="mt-8">
          <AdminEmptyState
            title="API admin no disponible"
            detail="No se pudo leer commercial-api. Verifica Central / fixture y que el servicio esté en marcha. No se muestran cifras inventadas."
          />
        </div>
      ) : null}

      {allEmpty ? (
        <div className="mt-8">
          <AdminEmptyState
            title="Sin actividad comercial aún"
            detail="Planes, pedidos, pagos, CRM, promociones y tickets están vacíos en Postgres. Crea contenido desde el menú lateral."
          />
        </div>
      ) : null}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="border border-[var(--border)] bg-white/70 p-5 hover:border-[var(--teal)]"
          >
            <p className="text-xs uppercase tracking-[0.14em] text-[var(--teal)]">{card.label}</p>
            <p className="mt-2 font-serif text-3xl">
              {card.count == null ? "—" : card.count}
            </p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              {card.count == null
                ? "Sin lectura"
                : card.count === 0
                  ? "Vacío"
                  : "Desde Postgres"}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
