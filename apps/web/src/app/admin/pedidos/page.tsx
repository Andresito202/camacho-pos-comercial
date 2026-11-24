import { Table } from "@camacho-pos/ui";
import { adminFetch } from "@/lib/api";
import { cookies } from "next/headers";
import { ADMIN_TOKEN_COOKIE } from "@/lib/auth";

export default async function AdminPedidosPage() {
  const token = (await cookies()).get(ADMIN_TOKEN_COOKIE)?.value;
  const rows = (await adminFetch<Array<{ id: string; name?: string; status?: string }>>("/v1/admin/pedidos", token)) ?? [];

  return (
    <div>
      <h1 className="font-serif text-3xl">Pedidos</h1>
      <p className="mt-2 text-[var(--muted)]">Pedidos y contrataciones.</p>
      <div className="mt-8 bg-white/70 p-4">
        <Table
          caption="Datos desde commercial-api (stub)."
          rows={rows.map((row) => ({ id: row.id, name: row.name ?? row.id, status: row.status ?? "—" }))}
          columns={[
            { key: "name", header: "Nombre", render: (row) => row.name },
            { key: "status", header: "Estado", render: (row) => row.status },
            { key: "id", header: "Id", render: (row) => row.id },
          ]}
          empty="Sin datos del API o endpoint admin aún no materializado. El acceso GLOBAL ya fue verificado en servidor."
        />
      </div>
    </div>
  );
}
