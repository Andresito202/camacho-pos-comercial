import { cookies } from "next/headers";
import { AdminActionForm, AdminSection } from "@/components/admin/AdminClientForms";
import { adminFetch } from "@/lib/api";
import { ADMIN_TOKEN_COOKIE } from "@/lib/auth";

type AjustesPayload = {
  settings: {
    brandName: string;
    whatsappNumber: string;
    supportEmail: string;
    promoBannerMessage?: string | null;
    promoBannerHref?: string | null;
    promoBannerCta?: string | null;
    publicationStatus: string;
  };
  social: Array<{ id: string; platform: string; url: string; publicationStatus: string }>;
};

export default async function AdminAjustesPage() {
  const token = (await cookies()).get(ADMIN_TOKEN_COOKIE)?.value;
  const data = await adminFetch<AjustesPayload>("/v1/admin/ajustes", token);
  const settings = data?.settings;

  return (
    <div>
      <h1 className="font-serif text-3xl">Ajustes del sitio</h1>
      <p className="mt-2 text-[var(--muted)]">WhatsApp, banners y redes sociales.</p>

      {settings ? (
        <AdminSection title="Site settings">
          <AdminActionForm
            title="WhatsApp / banners / marca"
            path="/v1/admin/ajustes"
            method="PATCH"
            token={token}
            fields={[
              { name: "brandName", label: "Marca", defaultValue: settings.brandName },
              {
                name: "whatsappNumber",
                label: "WhatsApp (E.164; DEV_PLACEHOLDER permitido fuera de prod)",
                defaultValue: settings.whatsappNumber,
              },
              { name: "supportEmail", label: "Email soporte", defaultValue: settings.supportEmail },
              {
                name: "promoBannerMessage",
                label: "Banner — mensaje",
                defaultValue: settings.promoBannerMessage ?? "",
              },
              {
                name: "promoBannerHref",
                label: "Banner — href",
                defaultValue: settings.promoBannerHref ?? "",
              },
              {
                name: "promoBannerCta",
                label: "Banner — CTA",
                defaultValue: settings.promoBannerCta ?? "",
              },
              {
                name: "publicationStatus",
                label: "Publicación",
                type: "select",
                defaultValue: settings.publicationStatus,
                options: [
                  { value: "DRAFT", label: "DRAFT" },
                  { value: "PUBLISHED", label: "PUBLISHED" },
                ],
              },
            ]}
          />
        </AdminSection>
      ) : (
        <p className="mt-6 text-[var(--muted)]">No se pudieron cargar ajustes del API.</p>
      )}

      <AdminSection title="Red social">
        <AdminActionForm
          title="Upsert enlace social"
          path="/v1/admin/ajustes/social"
          method="POST"
          token={token}
          submitLabel="Guardar enlace"
          fields={[
            { name: "platform", label: "Plataforma", defaultValue: "instagram", required: true },
            { name: "url", label: "URL", required: true },
            {
              name: "publicationStatus",
              label: "Estado",
              type: "select",
              defaultValue: "DRAFT",
              options: [
                { value: "DRAFT", label: "DRAFT" },
                { value: "PUBLISHED", label: "PUBLISHED" },
              ],
            },
          ]}
        />
        <ul className="mt-4 space-y-1 text-sm">
          {(data?.social ?? []).map((link) => (
            <li key={link.id}>
              {link.platform}: {link.url} · {link.publicationStatus}
            </li>
          ))}
        </ul>
      </AdminSection>
    </div>
  );
}
