import { cookies } from "next/headers";
import {
  AdminActionForm,
  AdminEmptyState,
  AdminSection,
} from "@/components/admin/AdminClientForms";
import { adminFetch } from "@/lib/api";
import { ADMIN_TOKEN_COOKIE } from "@/lib/auth";

type ContenidosPayload = {
  faqs: Array<{ id: string; question: string; answer: string; publicationStatus: string }>;
  blog: Array<{ id: string; title: string; body: string; excerpt?: string | null; publicationStatus: string }>;
  legal: Array<{ id: string; title: string; body: string; version: string; publicationStatus: string }>;
  seo: Array<{ id: string; path: string; title: string; description: string; robots?: string | null }>;
  social: Array<{ id: string; platform: string; url: string; publicationStatus: string }>;
};

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

export default async function AdminContenidosPage() {
  const token = (await cookies()).get(ADMIN_TOKEN_COOKIE)?.value;
  const [data, ajustes] = await Promise.all([
    adminFetch<ContenidosPayload>("/v1/admin/contenidos", token),
    adminFetch<AjustesPayload>("/v1/admin/ajustes", token),
  ]);

  const faqs = data?.faqs ?? [];
  const blog = data?.blog ?? [];
  const legal = data?.legal ?? [];
  const seo = data?.seo ?? [];
  const social = ajustes?.social ?? data?.social ?? [];
  const settings = ajustes?.settings;

  return (
    <div>
      <h1 className="font-serif text-3xl">Contenidos, WhatsApp, FAQ y SEO</h1>
      <p className="mt-2 text-[var(--muted)]">
        Settings, banners, FAQ, SEO y redes sociales — escrituras Prisma reales.
      </p>

      {settings ? (
        <AdminSection title="WhatsApp / banners">
          <AdminActionForm
            title="Site settings"
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
        <div className="mt-8">
          <AdminEmptyState
            title="Ajustes no disponibles"
            detail="No se pudo leer /v1/admin/ajustes."
          />
        </div>
      )}

      <AdminSection title="Redes sociales">
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
        {social.length === 0 ? (
          <AdminEmptyState title="Sin enlaces sociales" />
        ) : (
          <ul className="mt-4 space-y-1 text-sm">
            {social.map((link) => (
              <li key={link.id}>
                {link.platform}: {link.url} · {link.publicationStatus}
              </li>
            ))}
          </ul>
        )}
      </AdminSection>

      <AdminSection title="SEO metadata">
        <AdminActionForm
          title="Upsert SEO por path"
          path="/v1/admin/contenidos/seo"
          method="POST"
          token={token}
          submitLabel="Guardar SEO"
          fields={[
            {
              name: "path",
              label: "Path",
              defaultValue: seo[0]?.path ?? "/",
              required: true,
            },
            {
              name: "title",
              label: "Title",
              defaultValue: seo[0]?.title ?? "",
              required: true,
            },
            {
              name: "description",
              label: "Description",
              type: "textarea",
              defaultValue: seo[0]?.description ?? "",
              required: true,
            },
            {
              name: "robots",
              label: "Robots",
              defaultValue: seo[0]?.robots ?? "noindex,nofollow",
            },
          ]}
        />
        {seo.length === 0 ? (
          <AdminEmptyState title="Sin SEO rows aún" detail="El upsert creará la primera fila." />
        ) : (
          <ul className="mt-3 space-y-1 text-sm text-[var(--muted)]">
            {seo.map((row) => (
              <li key={row.id}>
                {row.path} — {row.title}
              </li>
            ))}
          </ul>
        )}
      </AdminSection>

      <AdminSection title="FAQ">
        <AdminActionForm
          title="Crear FAQ"
          path="/v1/admin/contenidos/faqs"
          method="POST"
          token={token}
          submitLabel="Crear FAQ"
          fields={[
            { name: "slug", label: "Slug", required: true },
            { name: "question", label: "Pregunta", required: true },
            { name: "answer", label: "Respuesta", type: "textarea", required: true },
            { name: "category", label: "Categoría" },
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
        {faqs.length === 0 ? (
          <AdminEmptyState title="Sin FAQ" detail="Crea la primera FAQ con el formulario anterior." />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {faqs.map((faq) => (
              <AdminActionForm
                key={faq.id}
                title={faq.question.slice(0, 60)}
                path={`/v1/admin/contenidos/faqs/${faq.id}`}
                method="PATCH"
                token={token}
                fields={[
                  { name: "question", label: "Pregunta", defaultValue: faq.question },
                  { name: "answer", label: "Respuesta", type: "textarea", defaultValue: faq.answer },
                  {
                    name: "publicationStatus",
                    label: "Estado",
                    type: "select",
                    defaultValue: faq.publicationStatus,
                    options: [
                      { value: "DRAFT", label: "DRAFT" },
                      { value: "PUBLISHED", label: "PUBLISHED" },
                    ],
                  },
                ]}
              />
            ))}
          </div>
        )}
      </AdminSection>

      <AdminSection title="Blog">
        <AdminActionForm
          title="Crear artículo"
          path="/v1/admin/contenidos/blog"
          method="POST"
          token={token}
          submitLabel="Crear post"
          fields={[
            { name: "slug", label: "Slug", required: true },
            { name: "title", label: "Título", required: true },
            { name: "excerpt", label: "Excerpt" },
            { name: "body", label: "Cuerpo", type: "textarea", required: true },
            { name: "coverImageUrl", label: "URL portada (opcional)" },
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
        {blog.length === 0 ? (
          <AdminEmptyState title="Sin posts" detail="Crea el primero con el formulario anterior." />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {blog.map((post) => (
              <AdminActionForm
                key={post.id}
                title={post.title}
                path={`/v1/admin/contenidos/blog/${post.id}`}
                method="PATCH"
                token={token}
                fields={[
                  { name: "title", label: "Título", defaultValue: post.title },
                  { name: "excerpt", label: "Excerpt", defaultValue: post.excerpt ?? "" },
                  { name: "body", label: "Cuerpo", type: "textarea", defaultValue: post.body },
                  {
                    name: "publicationStatus",
                    label: "Estado",
                    type: "select",
                    defaultValue: post.publicationStatus,
                    options: [
                      { value: "DRAFT", label: "DRAFT" },
                      { value: "PUBLISHED", label: "PUBLISHED" },
                    ],
                  },
                ]}
              />
            ))}
          </div>
        )}
      </AdminSection>

      <AdminSection title="Legal">
        {legal.length === 0 ? (
          <AdminEmptyState title="Sin documentos legales en DB" />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {legal.map((doc) => (
              <AdminActionForm
                key={doc.id}
                title={doc.title}
                path={`/v1/admin/contenidos/legal/${doc.id}`}
                method="PATCH"
                token={token}
                fields={[
                  { name: "title", label: "Título", defaultValue: doc.title },
                  { name: "version", label: "Versión", defaultValue: doc.version },
                  { name: "body", label: "Cuerpo", type: "textarea", defaultValue: doc.body },
                  {
                    name: "publicationStatus",
                    label: "Estado",
                    type: "select",
                    defaultValue: doc.publicationStatus,
                    options: [
                      { value: "DRAFT", label: "DRAFT" },
                      { value: "PUBLISHED", label: "PUBLISHED" },
                    ],
                  },
                ]}
              />
            ))}
          </div>
        )}
      </AdminSection>
    </div>
  );
}
