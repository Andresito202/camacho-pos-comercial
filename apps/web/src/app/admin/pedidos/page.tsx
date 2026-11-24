import { cookies } from "next/headers";
import { Table } from "@camacho-pos/ui";
import { adminFetch } from "@/lib/api";
import { ADMIN_TOKEN_COOKIE } from "@/lib/auth";
import { formatMoney } from "@/lib/format";

type OrderRow = {
  id: string;
  orderNumber: string;
  status: string;
  totalCents: number;
  createdAt: string;
  customer?: { fullName?: string; email?: string } | null;
};

export default async function AdminPedidosPage() {
  const token = (await cookies()).get(ADMIN_TOKEN_COOKIE)?.value;
  const orders = (await adminFetch<OrderRow[]>("/v1/admin/pedidos", token)) ?? [];

  return (
    <div>
      <h1 className="font-serif text-3xl">Pedidos</h1>
      <p className="mt-2 text-[var(--muted)]">Orders desde PostgreSQL comercial.</p>
      <div className="mt-8 bg-white/70 p-4">
        <Table
          caption="Orders"
          rows={orders}
          columns={[
            { key: "orderNumber", header: "Número", render: (r) => r.orderNumber },
            {
              key: "customer",
              header: "Cliente",
              render: (r) => r.customer?.fullName ?? r.customer?.email ?? "—",
            },
            { key: "status", header: "Estado", render: (r) => r.status },
            {
              key: "total",
              header: "Total",
              render: (r) => formatMoney({ amountCents: r.totalCents, currency: "COP" }),
            },
            { key: "createdAt", header: "Creado", render: (r) => r.createdAt.slice(0, 10) },
          ]}
          empty="Sin pedidos."
        />
      </div>
    </div>
  );
}
