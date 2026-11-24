import { cookies } from "next/headers";
import { Table } from "@camacho-pos/ui";
import {
  AdminEmptyState,
  AdminFilterForm,
  AdminSection,
} from "@/components/admin/AdminClientForms";
import { adminFetch } from "@/lib/api";
import { ADMIN_TOKEN_COOKIE } from "@/lib/auth";

type ClientesPayload = {
  contacts: Array<{ id: string; fullName: string; email: string; status: string; createdAt: string }>;
  leads: Array<{ id: string; fullName: string; email: string; status: string; createdAt: string }>;
  demos: Array<{ id: string; fullName: string; email: string; status: string; createdAt: string }>;
  customers: Array<{ id: string; fullName: string; email: string; createdAt: string }>;
};

const STATUS_OPTIONS = [
  { value: "NEW", label: "NEW" },
  { value: "CONTACTED", label: "CONTACTED" },
  { value: "QUALIFIED", label: "QUALIFIED" },
  { value: "DEMO_SCHEDULED", label: "DEMO_SCHEDULED" },
  { value: "WON", label: "WON" },
  { value: "LOST", label: "LOST" },
  { value: "ARCHIVED", label: "ARCHIVED" },
];

type Props = { searchParams: Promise<{ status?: string; q?: string }> };

export default async function AdminClientesPage({ searchParams }: Props) {
  const { status, q } = await searchParams;
  const token = (await cookies()).get(ADMIN_TOKEN_COOKIE)?.value;
  const qs = new URLSearchParams();
  if (status) qs.set("status", status);
  if (q) qs.set("q", q);
  const path = `/v1/admin/clientes${qs.toString() ? `?${qs}` : ""}`;
  const data = await adminFetch<ClientesPayload>(path, token);

  if (!data) {
    return (
      <div>
        <h1 className="font-serif text-3xl">Clientes y solicitudes</h1>
        <div className="mt-8">
          <AdminEmptyState
            title="No se pudo cargar CRM"
            detail="El endpoint /v1/admin/clientes no respondió. Sin datos inventados."
          />
        </div>
      </div>
    );
  }

  const total =
    data.contacts.length + data.leads.length + data.demos.length + data.customers.length;

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-serif text-3xl">Clientes y solicitudes</h1>
        <p className="mt-2 text-[var(--muted)]">
          ContactRequest, Lead, DemoRequest y CommercialCustomer con filtros reales.
        </p>
      </div>

      <AdminFilterForm
        action="/admin/clientes"
        statusOptions={STATUS_OPTIONS}
        status={status}
        q={q}
      />

      {total === 0 ? (
        <AdminEmptyState
          title="Sin resultados"
          detail={
            status || q
              ? "Ningún registro coincide con el filtro."
              : "Aún no hay leads, contactos ni demos en Postgres."
          }
        />
      ) : null}

      <AdminSection title="Contactos">
        <div className="bg-white/70 p-4">
          <Table
            caption="ContactRequest"
            rows={data.contacts}
            columns={[
              { key: "fullName", header: "Nombre", render: (r) => r.fullName },
              { key: "email", header: "Email", render: (r) => r.email },
              { key: "status", header: "Estado", render: (r) => r.status },
              { key: "createdAt", header: "Creado", render: (r) => r.createdAt.slice(0, 10) },
            ]}
            empty="Sin solicitudes de contacto."
          />
        </div>
      </AdminSection>

      <AdminSection title="Leads">
        <div className="bg-white/70 p-4">
          <Table
            caption="Lead"
            rows={data.leads}
            columns={[
              { key: "fullName", header: "Nombre", render: (r) => r.fullName },
              { key: "email", header: "Email", render: (r) => r.email },
              { key: "status", header: "Estado", render: (r) => r.status },
              { key: "createdAt", header: "Creado", render: (r) => r.createdAt.slice(0, 10) },
            ]}
            empty="Sin leads."
          />
        </div>
      </AdminSection>

      <AdminSection title="Demos">
        <div className="bg-white/70 p-4">
          <Table
            caption="DemoRequest"
            rows={data.demos}
            columns={[
              { key: "fullName", header: "Nombre", render: (r) => r.fullName },
              { key: "email", header: "Email", render: (r) => r.email },
              { key: "status", header: "Estado", render: (r) => r.status },
              { key: "createdAt", header: "Creado", render: (r) => r.createdAt.slice(0, 10) },
            ]}
            empty="Sin demos."
          />
        </div>
      </AdminSection>

      <AdminSection title="Clientes">
        <div className="bg-white/70 p-4">
          <Table
            caption="CommercialCustomer"
            rows={data.customers}
            columns={[
              { key: "fullName", header: "Nombre", render: (r) => r.fullName },
              { key: "email", header: "Email", render: (r) => r.email },
              { key: "createdAt", header: "Creado", render: (r) => r.createdAt.slice(0, 10) },
            ]}
            empty="Sin clientes."
          />
        </div>
      </AdminSection>
    </div>
  );
}
