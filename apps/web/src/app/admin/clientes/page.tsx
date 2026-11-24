import { cookies } from "next/headers";
import { Table } from "@camacho-pos/ui";
import { adminFetch } from "@/lib/api";
import { ADMIN_TOKEN_COOKIE } from "@/lib/auth";

type ClientesPayload = {
  contacts: Array<{ id: string; fullName: string; email: string; status: string; createdAt: string }>;
  leads: Array<{ id: string; fullName: string; email: string; status: string; createdAt: string }>;
  demos: Array<{ id: string; fullName: string; email: string; status: string; createdAt: string }>;
  customers: Array<{ id: string; fullName: string; email: string; createdAt: string }>;
};

export default async function AdminClientesPage() {
  const token = (await cookies()).get(ADMIN_TOKEN_COOKIE)?.value;
  const data = (await adminFetch<ClientesPayload>("/v1/admin/clientes", token)) ?? {
    contacts: [],
    leads: [],
    demos: [],
    customers: [],
  };

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-serif text-3xl">Clientes y solicitudes</h1>
        <p className="mt-2 text-[var(--muted)]">ContactRequest, Lead, DemoRequest y CommercialCustomer.</p>
      </div>

      <section>
        <h2 className="font-serif text-2xl">Contactos</h2>
        <div className="mt-4 bg-white/70 p-4">
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
      </section>

      <section>
        <h2 className="font-serif text-2xl">Leads</h2>
        <div className="mt-4 bg-white/70 p-4">
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
      </section>

      <section>
        <h2 className="font-serif text-2xl">Demos</h2>
        <div className="mt-4 bg-white/70 p-4">
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
      </section>

      <section>
        <h2 className="font-serif text-2xl">Clientes</h2>
        <div className="mt-4 bg-white/70 p-4">
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
      </section>
    </div>
  );
}
