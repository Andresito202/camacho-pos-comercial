import { cookies } from "next/headers";
import {
  AdminActionForm,
  AdminEmptyState,
  AdminSection,
} from "@/components/admin/AdminClientForms";
import { adminFetch } from "@/lib/api";
import { ADMIN_TOKEN_COOKIE } from "@/lib/auth";
import { formatMoney } from "@/lib/format";

type ProductRow = {
  id: string;
  name: string;
  sku: string;
  slug: string;
  description: string;
  publicationStatus: string;
  kind: string;
  images?: Array<{ id: string; url: string }>;
  variants?: Array<{
    id: string;
    name: string;
    amountCents: number;
    publicationStatus: string;
    stock?: { quantityOnHand: number } | null;
  }>;
};

type KitRow = {
  id: string;
  name: string;
  slug: string;
  amountCents: number;
  publicationStatus: string;
  description: string;
};

type StockRow = {
  id: string;
  productVariantId: string;
  quantityOnHand: number;
  variant?: { sku: string; product?: { name: string } };
};

export default async function AdminEquiposPage() {
  const token = (await cookies()).get(ADMIN_TOKEN_COOKIE)?.value;
  const [products, kits, inventory] = await Promise.all([
    adminFetch<ProductRow[]>("/v1/admin/catalog/products", token),
    adminFetch<KitRow[]>("/v1/admin/catalog/kits", token),
    adminFetch<StockRow[]>("/v1/admin/catalog/inventory", token),
  ]);

  return (
    <div>
      <h1 className="font-serif text-3xl">Productos, kits e inventario</h1>
      <p className="mt-2 text-[var(--muted)]">CRUD mínimo con escrituras Prisma reales.</p>

      <AdminSection title="Crear producto">
        <AdminActionForm
          title="Nuevo producto / accesorio"
          path="/v1/admin/catalog/products"
          method="POST"
          token={token}
          submitLabel="Crear"
          fields={[
            { name: "slug", label: "Slug", required: true },
            { name: "sku", label: "SKU", required: true },
            { name: "name", label: "Nombre", required: true },
            { name: "description", label: "Descripción", type: "textarea", required: true },
            {
              name: "kind",
              label: "Tipo",
              type: "select",
              defaultValue: "HARDWARE",
              options: [
                { value: "HARDWARE", label: "HARDWARE" },
                { value: "ACCESSORY", label: "ACCESSORY" },
                { value: "SERVICE", label: "SERVICE" },
                { value: "KIT", label: "KIT" },
              ],
            },
            {
              name: "imageUrl",
              label: "URL imagen (SVG preferido)",
              defaultValue: "/images/hardware/terminal-tactil.svg",
            },
            {
              name: "variantSku",
              label: "SKU variante",
              required: true,
              hint: "Crea variante + stock inicial en la misma operación",
            },
            { name: "variantName", label: "Nombre variante", required: true, defaultValue: "Estándar" },
            {
              name: "variantAmountCents",
              label: "Precio variante (COP enteros)",
              type: "number",
              required: true,
              defaultValue: 0,
            },
            {
              name: "quantityOnHand",
              label: "Inventario inicial",
              type: "number",
              defaultValue: 0,
            },
          ]}
        />
      </AdminSection>

      <AdminSection title="Productos">
        {(products ?? []).length === 0 ? (
          <AdminEmptyState
            title="Sin productos"
            detail="Crea el primer equipo o accesorio con el formulario de arriba."
          />
        ) : null}
        <div className="space-y-6">
          {(products ?? []).map((product) => (
            <div key={product.id} className="border border-[var(--border)] bg-white/70 p-4">
              <h3 className="font-serif text-xl">
                {product.name}{" "}
                <span className="text-sm text-[var(--muted)]">
                  {product.sku} · {product.publicationStatus}
                </span>
              </h3>
              <div className="mt-3 grid gap-4 lg:grid-cols-2">
                <AdminActionForm
                  title="Actualizar producto"
                  path={`/v1/admin/catalog/products/${product.id}`}
                  method="PATCH"
                  token={token}
                  fields={[
                    { name: "name", label: "Nombre", defaultValue: product.name },
                    {
                      name: "description",
                      label: "Descripción",
                      type: "textarea",
                      defaultValue: product.description,
                    },
                    {
                      name: "publicationStatus",
                      label: "Publicación",
                      type: "select",
                      defaultValue: product.publicationStatus,
                      options: [
                        { value: "DRAFT", label: "DRAFT" },
                        { value: "PUBLISHED", label: "PUBLISHED" },
                        { value: "ARCHIVED", label: "ARCHIVED" },
                      ],
                    },
                  ]}
                />
                <AdminActionForm
                  title="Agregar imagen"
                  path={`/v1/admin/catalog/products/${product.id}/images`}
                  method="POST"
                  token={token}
                  submitLabel="Agregar imagen"
                  fields={[
                    {
                      name: "url",
                      label: "URL",
                      defaultValue: "/images/hardware/impresora-termica.svg",
                      required: true,
                    },
                    { name: "alt", label: "Alt", defaultValue: `${product.name} — ilustración SVG` },
                  ]}
                />
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {(product.variants ?? []).map((variant) => (
                  <div key={variant.id} className="space-y-2">
                    <AdminActionForm
                      title={`Precio variante ${variant.name} (${formatMoney({ amountCents: variant.amountCents, currency: "COP" })})`}
                      path={`/v1/admin/catalog/variants/${variant.id}/price`}
                      method="PATCH"
                      token={token}
                      fields={[
                        {
                          name: "amountCents",
                          label: "Monto COP",
                          type: "number",
                          defaultValue: variant.amountCents,
                          required: true,
                        },
                        { name: "publish", label: "Publicar", type: "checkbox" },
                      ]}
                    />
                    <AdminActionForm
                      title={`Stock (${variant.stock?.quantityOnHand ?? 0})`}
                      path={`/v1/admin/catalog/inventory/${variant.id}`}
                      method="PATCH"
                      token={token}
                      fields={[
                        {
                          name: "quantityOnHand",
                          label: "Cantidad",
                          type: "number",
                          defaultValue: variant.stock?.quantityOnHand ?? 0,
                        },
                      ]}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </AdminSection>

      <AdminSection title="Kits">
        <div className="grid gap-4 lg:grid-cols-2">
          {(kits ?? []).map((kit) => (
            <AdminActionForm
              key={kit.id}
              title={`${kit.name} — ${formatMoney({ amountCents: kit.amountCents, currency: "COP" })}`}
              path={`/v1/admin/catalog/kits/${kit.id}`}
              method="PATCH"
              token={token}
              fields={[
                { name: "name", label: "Nombre", defaultValue: kit.name },
                {
                  name: "description",
                  label: "Descripción",
                  type: "textarea",
                  defaultValue: kit.description,
                },
                {
                  name: "amountCents",
                  label: "Monto COP",
                  type: "number",
                  defaultValue: kit.amountCents,
                },
                {
                  name: "publicationStatus",
                  label: "Publicación",
                  type: "select",
                  defaultValue: kit.publicationStatus,
                  options: [
                    { value: "DRAFT", label: "DRAFT" },
                    { value: "PUBLISHED", label: "PUBLISHED" },
                    { value: "ARCHIVED", label: "ARCHIVED" },
                  ],
                },
              ]}
            />
          ))}
        </div>
      </AdminSection>

      <AdminSection title="Inventario (resumen)">
        <ul className="space-y-1 text-sm">
          {(inventory ?? []).slice(0, 40).map((row) => (
            <li key={row.id}>
              {row.variant?.product?.name ?? row.productVariantId} · {row.variant?.sku} ·{" "}
              {row.quantityOnHand} uds
            </li>
          ))}
        </ul>
      </AdminSection>
    </div>
  );
}
