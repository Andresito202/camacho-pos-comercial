import { cookies } from "next/headers";
import { AdminActionForm, AdminSection } from "@/components/admin/AdminClientForms";
import { adminFetch } from "@/lib/api";
import { ADMIN_TOKEN_COOKIE } from "@/lib/auth";

type Ticket = {
  id: string;
  email: string;
  subject: string;
  status: string;
  priority: string;
  updatedAt: string;
  messages?: Array<{ body: string; actorType: string }>;
};

export default async function AdminTicketsPage() {
  const token = (await cookies()).get(ADMIN_TOKEN_COOKIE)?.value;
  const tickets = (await adminFetch<Ticket[]>("/v1/admin/tickets", token)) ?? [];

  return (
    <div>
      <h1 className="font-serif text-3xl">Tickets de soporte</h1>
      <p className="mt-2 text-[var(--muted)]">Listado y respuesta administrativa.</p>

      <AdminSection title="Abiertos / recientes">
        <div className="space-y-6">
          {tickets.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">Sin tickets.</p>
          ) : (
            tickets.map((ticket) => (
              <div key={ticket.id} className="border border-[var(--border)] bg-white/70 p-4">
                <h3 className="font-serif text-xl">{ticket.subject}</h3>
                <p className="text-sm text-[var(--muted)]">
                  {ticket.email} · {ticket.status} · {ticket.priority} ·{" "}
                  {ticket.updatedAt.slice(0, 10)}
                </p>
                {ticket.messages?.[0] ? (
                  <p className="mt-2 text-sm">
                    Último: [{ticket.messages[0].actorType}] {ticket.messages[0].body.slice(0, 160)}
                  </p>
                ) : null}
                <div className="mt-3">
                  <AdminActionForm
                    title="Responder"
                    path={`/v1/admin/tickets/${ticket.id}/reply`}
                    method="POST"
                    token={token}
                    submitLabel="Enviar respuesta"
                    fields={[
                      { name: "body", label: "Mensaje", type: "textarea", required: true },
                      {
                        name: "status",
                        label: "Estado",
                        type: "select",
                        defaultValue: "IN_PROGRESS",
                        options: [
                          { value: "IN_PROGRESS", label: "IN_PROGRESS" },
                          { value: "WAITING_CUSTOMER", label: "WAITING_CUSTOMER" },
                          { value: "RESOLVED", label: "RESOLVED" },
                          { value: "CLOSED", label: "CLOSED" },
                        ],
                      },
                    ]}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </AdminSection>
    </div>
  );
}
