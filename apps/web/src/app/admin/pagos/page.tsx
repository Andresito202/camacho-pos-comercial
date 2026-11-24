import { cookies } from "next/headers";
import { Table } from "@camacho-pos/ui";
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

export default async function AdminPagosPage() {
  const token = (await cookies()).get(ADMIN_TOKEN_COOKIE)?.value;
  const payments = (await adminFetch<PaymentRow[]>("/v1/admin/pagos", token)) ?? [];

  return (
    <div>
      <h1 className="font-serif text-3xl">Pagos</h1>
      <p className="mt-2 text-[var(--muted)]">Payments / FACTUS Pay sandbox o mock.</p>
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
          empty="Sin pagos."
        />
      </div>
    </div>
  );
}
