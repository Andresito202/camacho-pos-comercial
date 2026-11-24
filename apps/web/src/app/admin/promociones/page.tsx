import { Table } from "@camacho-pos/ui";
import { adminFetch } from "@/lib/api";
import { cookies } from "next/headers";
import { ADMIN_TOKEN_COOKIE } from "@/lib/auth";

type AdminRow = { id: string; name: string; status: string };

export default async function AdminPromocionesPage() {
  const token = (await cookies()).get(ADMIN_TOKEN_COOKIE)?.value;
  const raw = (await adminFetch<Array<{ id: string; name?: string; status?: string; publicationStatus?: string }>>("/v1/admin/promociones", token)) ?? [];
  const rows: AdminRow[] = raw.map((row) => ({
    id: row.id,
    name: row.name ?? row.id,
    status: row.status ?? row.publicationStatus ?? "—",
  }));

  return (
    <div>
      <h1 className="font-serif text-3xl">Promociones</h1>
      <p className="mt-2 text-[var(--muted)]">Promo bar y campañas.</p>
      <div className="mt-8 bg-white/70 p-4">
        <Table
          caption="Datos desde commercial-api (stub)."
          rows={rows}
          columns={[
            { key: "name", header: "Nombre", render: (row: AdminRow) => row.name },
            { key: "status", header: "Estado", render: (row: AdminRow) => row.status },
            { key: "id", header: "Id", render: (row: AdminRow) => row.id },
          ]}
          empty="Sin datos del API o endpoint admin aún no materializado. El acceso GLOBAL ya fue verificado en servidor."
        />
      </div>
    </div>
  );
}
