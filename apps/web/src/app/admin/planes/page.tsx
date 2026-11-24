import { cookies } from "next/headers";
import { AdminActionForm, AdminSection } from "@/components/admin/AdminClientForms";
import { adminFetch } from "@/lib/api";
import { ADMIN_TOKEN_COOKIE } from "@/lib/auth";
import { formatMoney } from "@/lib/format";

type PlanRow = {
  id: string;
  name: string;
  slug: string;
  publicationStatus: string;
  description?: string;
  tagline?: string | null;
  prices?: Array<{
    id: string;
    billingInterval: string;
    amountCents: number;
    publicationStatus: string;
    version: number;
  }>;
  features?: Array<{ id: string; code: string; label: string; commercialStatus: string }>;
};

export default async function AdminPlanesPage() {
  const token = (await cookies()).get(ADMIN_TOKEN_COOKIE)?.value;
  const plans = (await adminFetch<PlanRow[]>("/v1/admin/catalog/plans", token)) ?? [];

  return (
    <div>
      <h1 className="font-serif text-3xl">Planes y precios</h1>
      <p className="mt-2 text-[var(--muted)]">
        Actualiza metadatos, features y montos vía PATCH/POST reales del commercial-api.
      </p>

      {plans.map((plan) => (
        <AdminSection key={plan.id} title={`${plan.name} (${plan.slug})`}>
          <p className="text-sm text-[var(--muted)]">Estado: {plan.publicationStatus}</p>
          <div className="grid gap-4 lg:grid-cols-2">
            <AdminActionForm
              title="Metadatos del plan"
              path={`/v1/admin/catalog/plans/${plan.id}`}
              method="PATCH"
              token={token}
              fields={[
                { name: "name", label: "Nombre", defaultValue: plan.name, required: true },
                { name: "tagline", label: "Tagline", defaultValue: plan.tagline ?? "" },
                {
                  name: "description",
                  label: "Descripción",
                  type: "textarea",
                  defaultValue: plan.description ?? "",
                },
                {
                  name: "publicationStatus",
                  label: "Publicación",
                  type: "select",
                  defaultValue: plan.publicationStatus,
                  options: [
                    { value: "DRAFT", label: "DRAFT" },
                    { value: "PUBLISHED", label: "PUBLISHED" },
                    { value: "ARCHIVED", label: "ARCHIVED" },
                  ],
                },
              ]}
            />
            <AdminActionForm
              title="Agregar / actualizar feature"
              path={`/v1/admin/catalog/plans/${plan.id}/features`}
              method="POST"
              token={token}
              fields={[
                { name: "code", label: "Código", required: true },
                { name: "label", label: "Etiqueta", required: true },
                { name: "description", label: "Descripción", type: "textarea" },
                {
                  name: "commercialStatus",
                  label: "Estado comercial",
                  type: "select",
                  defaultValue: "AVAILABLE",
                  options: [
                    { value: "AVAILABLE", label: "AVAILABLE" },
                    { value: "IN_CERTIFICATION", label: "IN_CERTIFICATION" },
                    { value: "COMING_SOON", label: "COMING_SOON" },
                    { value: "UNPUBLISHED", label: "UNPUBLISHED" },
                  ],
                },
              ]}
            />
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {(plan.prices ?? []).map((price) => (
              <AdminActionForm
                key={price.id}
                title={`Precio ${price.billingInterval} v${price.version} (${formatMoney({ amountCents: price.amountCents, currency: "COP" })})`}
                path={`/v1/admin/catalog/plan-prices/${price.id}`}
                method="PATCH"
                token={token}
                fields={[
                  {
                    name: "amountCents",
                    label: "Monto (COP enteros)",
                    type: "number",
                    defaultValue: price.amountCents,
                    required: true,
                  },
                  { name: "publish", label: "Publicar (PUBLISHED)", type: "checkbox", defaultValue: false },
                ]}
              />
            ))}
          </div>

          {(plan.features ?? []).length ? (
            <ul className="mt-3 list-disc pl-5 text-sm text-[var(--steel)]">
              {plan.features!.map((f) => (
                <li key={f.id}>
                  {f.label} <span className="text-[var(--muted)]">({f.code} · {f.commercialStatus})</span>
                </li>
              ))}
            </ul>
          ) : null}
        </AdminSection>
      ))}
    </div>
  );
}
