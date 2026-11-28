import { cookies } from "next/headers";
import { Table } from "@camacho-pos/ui";
import { AdminEmptyState, AdminFilterForm } from "@/components/admin/AdminClientForms";
import { adminFetch } from "@/lib/api";
import { ADMIN_TOKEN_COOKIE } from "@/lib/auth";
import { formatMoney } from "@/lib/format";

type PaymentRow = {
  id: string;
  referenceCode: string;
  status: string;
  amountCents: number;
  provider: string;
  createdAt: string;
  customer?: { fullName?: string; email?: string } | null;
  order?: { orderNumber?: string } | null;
};

const STATUS_OPTIONS = [
  { value: "PENDING", label: "PENDING" },
  { value: "REQUIRES_ACTION", label: "REQUIRES_ACTION" },
  { value: "AUTHORIZED", label: "AUTHORIZED" },
  { value: "PAID", label: "PAID" },
  { value: "FAILED", label: "FAILED" },
  { value: "CANCELLED", label: "CANCELLED" },
  { value: "REFUNDED", label: "REFUNDED" },
];

type Props = { searchParams: Promise<{ status?: string }> };

export default async function AdminPagosPage({ searchParams }: Props) {
  const { status } = await searchParams;
  const token = (await cookies()).get(ADMIN_TOKEN_COOKIE)?.value;
  const path = status
    ? `/v1/admin/pagos?status=${encodeURIComponent(status)}`
    : "/v1/admin/pagos";
  const payments = await adminFetch<PaymentRow[]>(path, token);

  return (
    <div>
      <h1 className="font-serif text-3xl">Pagos</h1>
      <p className="mt-2 text-[var(--muted)]">Payments / FACTUS Pay sandbox o mock.</p>

      <div className="mt-6">
        <AdminFilterForm
          action="/admin/pagos"
          statusOptions={STATUS_OPTIONS}
          status={status}
          showSearch={false}
        />
      </div>

      {payments == null ? (
        <div className="mt-8">
          <AdminEmptyState
            title="No se pudo cargar pagos"
            detail="El endpoint /v1/admin/pagos no respondió."
          />
        </div>
      ) : (
        <div className="mt-8 bg-white/70 p-4">
          <Table
            caption="Payments"
            rows={payments}
            columns={[
              { key: "referenceCode", header: "Referencia", render: (r) => r.referenceCode },
              {
                key: "order",
                header: "Pedido",
                render: (r) => r.order?.orderNumber ?? "—",
              },
              {
                key: "customer",
                header: "Cliente",
                render: (r) => r.customer?.email ?? "—",
              },
              { key: "status", header: "Estado", render: (r) => r.status },
              { key: "provider", header: "Provider", render: (r) => r.provider },
              {
                key: "amount",
                header: "Monto",
                render: (r) => formatMoney({ amountCents: r.amountCents, currency: "COP" }),
              },
            ]}
            empty={status ? "Sin pagos con ese estado." : "Sin pagos."}
          />
        </div>
      )}
    </div>
  );
}
