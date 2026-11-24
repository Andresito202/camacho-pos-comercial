import { cookies } from "next/headers";
import { Table } from "@camacho-pos/ui";
import {
  AdminActionForm,
  AdminEmptyState,
  AdminFilterForm,
  AdminSection,
} from "@/components/admin/AdminClientForms";
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
  payments?: Array<{
    id: string;
    status: string;
    provider: string;
    referenceCode: string;
    amountCents: number;
  }>;
  shipments?: Array<{
    id: string;
    status: string;
    carrier?: string | null;
    trackingCode?: string | null;
  }>;
  items?: Array<{ label: string; quantity: number; kitId?: string | null; productId?: string | null }>;
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
      <p className="mt-2 text-[var(--muted)]">
        Despacho, entrega, cancelación y devoluciones locales. No se simulan reembolsos Factus Pay.
      </p>

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
        <>
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
                  key: "shipment",
                  header: "Envío",
                  render: (r) => r.shipments?.[0]?.status ?? "—",
                },
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

          <AdminSection title="Acciones por pedido">
            {orders.length === 0 ? (
              <AdminEmptyState title="Sin pedidos para operar" />
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {orders.slice(0, 12).map((order) => {
                  const payment = order.payments?.[0];
                  const shipment = order.shipments?.[0];
                  return (
                    <div key={order.id} className="space-y-3 border border-[var(--border)] bg-white/80 p-4">
                      <div>
                        <h3 className="font-serif text-lg">{order.orderNumber}</h3>
                        <p className="text-sm text-[var(--muted)]">
                          {order.status}
                          {payment ? ` · pago ${payment.provider}/${payment.status}` : ""}
                          {shipment ? ` · envío ${shipment.status}` : ""}
                        </p>
                        <ul className="mt-2 text-xs text-[var(--steel)]">
                          {(order.items ?? []).map((item, idx) => (
                            <li key={`${order.id}-${idx}`}>
                              {item.quantity}× {item.label}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <AdminActionForm
                        title="Preparar / listo para despacho"
                        path={`/v1/admin/pedidos/${order.id}`}
                        method="PATCH"
                        token={token}
                        submitLabel="Marcar READY"
                        fields={[
                          {
                            name: "action",
                            label: "Acción",
                            type: "select",
                            defaultValue: "MARK_READY",
                            options: [
                              { value: "PREPARE_SHIPMENT", label: "PREPARE_SHIPMENT" },
                              { value: "MARK_READY", label: "MARK_READY" },
                            ],
                            required: true,
                          },
                          { name: "carrier", label: "Transportadora" },
                          { name: "trackingCode", label: "Guía (opcional en READY)" },
                        ]}
                      />

                      <AdminActionForm
                        title="Despachar"
                        path={`/v1/admin/pedidos/${order.id}`}
                        method="PATCH"
                        token={token}
                        submitLabel="SHIP"
                        fields={[
                          {
                            name: "action",
                            label: "Acción",
                            type: "select",
                            defaultValue: "SHIP",
                            options: [{ value: "SHIP", label: "SHIP" }],
                            required: true,
                          },
                          { name: "carrier", label: "Transportadora", required: true },
                          { name: "trackingCode", label: "Guía", required: true },
                        ]}
                      />

                      <AdminActionForm
                        title="Entregar / cancelar / devolución local"
                        path={`/v1/admin/pedidos/${order.id}`}
                        method="PATCH"
                        token={token}
                        submitLabel="Ejecutar"
                        fields={[
                          {
                            name: "action",
                            label: "Acción",
                            type: "select",
                            defaultValue: "DELIVER",
                            options: [
                              { value: "DELIVER", label: "DELIVER → FULFILLED" },
                              { value: "CANCEL", label: "CANCEL" },
                              {
                                value: "MARK_RETURN_RECEIVED",
                                label: "MARK_RETURN_RECEIVED (local, sin Factus)",
                              },
                              {
                                value: "MANUAL_REFUND_MARK",
                                label: "MANUAL_REFUND_MARK (solo MANUAL/SANDBOX_MOCK)",
                              },
                            ],
                            required: true,
                          },
                          {
                            name: "reason",
                            label: "Motivo (cancel/devolución)",
                            type: "textarea",
                          },
                        ]}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </AdminSection>
        </>
      )}
    </div>
  );
}
