import { cookies } from "next/headers";
import {
  AdminActionForm,
  AdminEmptyState,
  AdminSection,
  isoToBogotaDatetimeLocal,
} from "@/components/admin/AdminClientForms";
import { adminFetch } from "@/lib/api";
import { ADMIN_TOKEN_COOKIE } from "@/lib/auth";

type Promo = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  publicationStatus: string;
  startsAt?: string | null;
  endsAt?: string | null;
};

type Coupon = {
  id: string;
  code: string;
  type: string;
  percentOff?: number | null;
  amountOffCents?: number | null;
  active: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
};

export default async function AdminPromocionesPage() {
  const token = (await cookies()).get(ADMIN_TOKEN_COOKIE)?.value;
  const [promos, coupons] = await Promise.all([
    adminFetch<Promo[]>("/v1/admin/promociones", token),
    adminFetch<Coupon[]>("/v1/admin/cupones", token),
  ]);

  return (
    <div>
      <h1 className="font-serif text-3xl">Promociones y cupones</h1>
      <p className="mt-2 text-[var(--muted)]">
        CRUD real. Ventanas de vigencia se programan y evalúan en America/Bogota.
      </p>

      <AdminSection title="Crear promoción">
        <AdminActionForm
          title="Nueva promoción"
          path="/v1/admin/promociones"
          method="POST"
          token={token}
          submitLabel="Crear"
          fields={[
            { name: "code", label: "Código", required: true },
            { name: "name", label: "Nombre", required: true },
            { name: "description", label: "Descripción", type: "textarea" },
            {
              name: "publicationStatus",
              label: "Estado (activar = PUBLISHED)",
              type: "select",
              defaultValue: "DRAFT",
              options: [
                { value: "DRAFT", label: "DRAFT (inactiva)" },
                { value: "PUBLISHED", label: "PUBLISHED (activa)" },
                { value: "ARCHIVED", label: "ARCHIVED (desactivada)" },
              ],
            },
            {
              name: "startsAt",
              label: "Inicia (America/Bogota)",
              type: "datetime-local",
              hint: "Hora local Colombia; el API guarda el instante UTC equivalente",
            },
            {
              name: "endsAt",
              label: "Termina (America/Bogota)",
              type: "datetime-local",
            },
          ]}
        />
      </AdminSection>

      <AdminSection title="Promociones existentes">
        {(promos ?? []).length === 0 ? (
          <AdminEmptyState title="Sin promociones" detail="Crea una campaña con ventana America/Bogota." />
        ) : null}
        <div className="grid gap-4 lg:grid-cols-2">
          {(promos ?? []).map((promo) => (
            <AdminActionForm
              key={promo.id}
              title={`${promo.name} (${promo.code})`}
              path={`/v1/admin/promociones/${promo.id}`}
              method="PATCH"
              token={token}
              fields={[
                { name: "name", label: "Nombre", defaultValue: promo.name },
                {
                  name: "description",
                  label: "Descripción",
                  type: "textarea",
                  defaultValue: promo.description ?? "",
                },
                {
                  name: "publicationStatus",
                  label: "Activar / desactivar",
                  type: "select",
                  defaultValue: promo.publicationStatus,
                  options: [
                    { value: "DRAFT", label: "DRAFT (inactiva)" },
                    { value: "PUBLISHED", label: "PUBLISHED (activa)" },
                    { value: "ARCHIVED", label: "ARCHIVED (desactivada)" },
                  ],
                },
                {
                  name: "startsAt",
                  label: "Inicia (America/Bogota)",
                  type: "datetime-local",
                  defaultValue: isoToBogotaDatetimeLocal(promo.startsAt),
                },
                {
                  name: "endsAt",
                  label: "Termina (America/Bogota)",
                  type: "datetime-local",
                  defaultValue: isoToBogotaDatetimeLocal(promo.endsAt),
                },
              ]}
            />
          ))}
        </div>
      </AdminSection>

      <AdminSection title="Crear cupón">
        <AdminActionForm
          title="Nuevo cupón"
          path="/v1/admin/cupones"
          method="POST"
          token={token}
          submitLabel="Crear cupón"
          fields={[
            { name: "code", label: "Código", required: true },
            {
              name: "type",
              label: "Tipo",
              type: "select",
              defaultValue: "PERCENT",
              options: [
                { value: "PERCENT", label: "PERCENT" },
                { value: "FIXED_AMOUNT", label: "FIXED_AMOUNT" },
              ],
            },
            { name: "percentOff", label: "% off", type: "number", defaultValue: 10 },
            { name: "amountOffCents", label: "Monto off COP", type: "number" },
            { name: "active", label: "Activo", type: "checkbox", defaultValue: true },
            {
              name: "startsAt",
              label: "Inicia (America/Bogota)",
              type: "datetime-local",
            },
            {
              name: "endsAt",
              label: "Termina (America/Bogota)",
              type: "datetime-local",
            },
          ]}
        />
      </AdminSection>

      <AdminSection title="Cupones">
        {(coupons ?? []).length === 0 ? (
          <AdminEmptyState title="Sin cupones" detail="Crea un cupón y programa su ventana." />
        ) : null}
        <div className="grid gap-4 lg:grid-cols-2">
          {(coupons ?? []).map((coupon) => (
            <AdminActionForm
              key={coupon.id}
              title={`${coupon.code} · ${coupon.type}`}
              path={`/v1/admin/cupones/${coupon.id}`}
              method="PATCH"
              token={token}
              fields={[
                {
                  name: "type",
                  label: "Tipo",
                  type: "select",
                  defaultValue: coupon.type,
                  options: [
                    { value: "PERCENT", label: "PERCENT" },
                    { value: "FIXED_AMOUNT", label: "FIXED_AMOUNT" },
                  ],
                },
                {
                  name: "percentOff",
                  label: "% off",
                  type: "number",
                  defaultValue: coupon.percentOff ?? 0,
                },
                {
                  name: "amountOffCents",
                  label: "Monto off",
                  type: "number",
                  defaultValue: coupon.amountOffCents ?? 0,
                },
                {
                  name: "active",
                  label: "Activo (activar / desactivar)",
                  type: "checkbox",
                  defaultValue: coupon.active,
                },
                {
                  name: "startsAt",
                  label: "Inicia (America/Bogota)",
                  type: "datetime-local",
                  defaultValue: isoToBogotaDatetimeLocal(coupon.startsAt),
                },
                {
                  name: "endsAt",
                  label: "Termina (America/Bogota)",
                  type: "datetime-local",
                  defaultValue: isoToBogotaDatetimeLocal(coupon.endsAt),
                },
              ]}
            />
          ))}
        </div>
      </AdminSection>
    </div>
  );
}
