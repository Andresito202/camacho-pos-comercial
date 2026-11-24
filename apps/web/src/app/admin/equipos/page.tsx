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
  items?: Array<{
    id: string;
    quantity: number;
    productVariantId: string;
    variant?: {
      id: string;
      sku: string;
      name: string;
      amountCents: number;
      stock?: { quantityOnHand: number } | null;
      product?: { name: string; sku: string };
    };
  }>;
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

  const variantOptions = (products ?? [])
    .flatMap((product) =>
      (product.variants ?? []).map((variant) => ({
        id: variant.id,
        label: `${product.name} / ${variant.name} (${variant.id.slice(0, 8)}…) stock=${variant.stock?.quantityOnHand ?? 0}`,
      })),
    );

  const defaultItemsJson =
    variantOptions.length > 0
      ? JSON.stringify(
          [{ productVariantId: variantOptions[0]!.id, quantity: 1 }],
          null,
          2,
        )
      : '[\n  { "productVariantId": "VARIANT_ID", "quantity": 1 }\n]';

  return (
    <div>
      <h1 className="font-serif text-3xl">Productos, kits e inventario</h1>
      <p className="mt-2 text-[var(--muted)]">CRUD con escrituras Prisma reales (componentes, stock y precios).</p>

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

      <AdminSection title="Crear kit POS">
        {variantOptions.length === 0 ? (
          <AdminEmptyState
            title="Sin variantes disponibles"
            detail="Crea al menos un producto con variante antes de armar un kit."
          />
        ) : (
          <AdminActionForm
            title="Nuevo kit con componentes"
            path="/v1/admin/catalog/kits"
            method="POST"
            token={token}
            submitLabel="Crear kit"
            fields={[
              { name: "slug", label: "Slug", required: true },
              { name: "sku", label: "SKU producto kit", required: true },
              { name: "name", label: "Nombre", required: true },
              { name: "description", label: "Descripción", type: "textarea", required: true },
              {
                name: "amountCents",
                label: "Precio kit (COP enteros)",
                type: "number",
                required: true,
                defaultValue: 0,
              },
              {
                name: "imageUrl",
                label: "URL imagen",
                defaultValue: "/images/hardware/terminal-tactil.svg",
              },
              {
                name: "publicationStatus",
                label: "Publicación",
                type: "select",
                defaultValue: "DRAFT",
                options: [
                  { value: "DRAFT", label: "DRAFT" },
                  { value: "PUBLISHED", label: "PUBLISHED" },
                ],
              },
              {
                name: "items",
                label: "Componentes (JSON)",
                type: "json",
                required: true,
                defaultValue: defaultItemsJson,
                hint: `Variantes disponibles: ${variantOptions
                  .slice(0, 6)
                  .map((v) => v.label)
                  .join(" · ")}`,
              },
            ]}
          />
        )}
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
                    <p className="text-xs text-[var(--muted)]">variantId: {variant.id}</p>
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
        {(kits ?? []).length === 0 ? (
          <AdminEmptyState title="Sin kits" detail="Crea el primer kit con el formulario de arriba." />
        ) : null}
        <div className="grid gap-4 lg:grid-cols-2">
          {(kits ?? []).map((kit) => {
            const itemsJson = JSON.stringify(
              (kit.items ?? []).map((item) => ({
                productVariantId: item.productVariantId,
                quantity: item.quantity,
              })),
              null,
              2,
            );
            return (
              <div key={kit.id} className="space-y-3 border border-[var(--border)] bg-white/70 p-4">
                <AdminActionForm
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
                <ul className="text-sm text-[var(--muted)]">
                  {(kit.items ?? []).map((item) => (
                    <li key={item.id}>
                      {item.quantity}× {item.variant?.product?.name ?? item.productVariantId} (
                      {item.variant?.sku}) · stock {item.variant?.stock?.quantityOnHand ?? "—"}
                    </li>
                  ))}
                </ul>
                <AdminActionForm
                  title="Reemplazar componentes del kit"
                  path={`/v1/admin/catalog/kits/${kit.id}/items`}
                  method="PUT"
                  token={token}
                  submitLabel="Guardar componentes"
                  fields={[
                    {
                      name: "items",
                      label: "Componentes (JSON)",
                      type: "json",
                      required: true,
                      defaultValue: itemsJson || defaultItemsJson,
                    },
                  ]}
                />
              </div>
            );
          })}
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
