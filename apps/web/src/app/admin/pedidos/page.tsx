import { cookies } from "next/headers";
import { Table } from "@camacho-pos/ui";
import { AdminEmptyState, AdminFilterForm } from "@/components/admin/AdminClientForms";
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

const STATUS_OPTIONS = [
  { value: "PENDING_PAYMENT", label: "PENDING_PAYMENT" },
  { value: "PAID", label: "PAID" },
  { value: "PROVISIONING", label: "PROVISIONING" },
  { value: "FULFILLED", label: "FULFILLED" },
  { value: "CANCELLED", label: "CANCELLED" },
  { value: "REFUNDED", label: "REFUNDED" },
  { value: "FAILED", label: "FAILED" },
];

type Props = { searchParams: Promise<{ status?: string }> };

export default async function AdminPedidosPage({ searchParams }: Props) {
  const { status } = await searchParams;
  const token = (await cookies()).get(ADMIN_TOKEN_COOKIE)?.value;
  const path = status
    ? `/v1/admin/pedidos?status=${encodeURIComponent(status)}`
    : "/v1/admin/pedidos";
  const orders = await adminFetch<OrderRow[]>(path, token);

  return (
    <div>
      <h1 className="font-serif text-3xl">Pedidos</h1>
      <p className="mt-2 text-[var(--muted)]">Orders desde PostgreSQL comercial.</p>

      <div className="mt-6">
        <AdminFilterForm
          action="/admin/pedidos"
          statusOptions={STATUS_OPTIONS}
          status={status}
          showSearch={false}
        />
      </div>

      {orders == null ? (
        <div className="mt-8">
          <AdminEmptyState
            title="No se pudo cargar pedidos"
            detail="El endpoint /v1/admin/pedidos no respondió."
          />
        </div>
      ) : (
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
            empty={status ? "Sin pedidos con ese estado." : "Sin pedidos."}
          />
        </div>
      )}
    </div>
  );
}
