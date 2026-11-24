import { cookies } from "next/headers";
import { AdminActionForm, AdminSection } from "@/components/admin/AdminClientForms";
import { adminFetch } from "@/lib/api";
import { ADMIN_TOKEN_COOKIE } from "@/lib/auth";

type ContenidosPayload = {
  faqs: Array<{ id: string; question: string; answer: string; publicationStatus: string }>;
  blog: Array<{ id: string; title: string; body: string; excerpt?: string | null; publicationStatus: string }>;
  legal: Array<{ id: string; title: string; body: string; version: string; publicationStatus: string }>;
  seo: Array<{ id: string; path: string; title: string; description: string; robots?: string | null }>;
};

export default async function AdminContenidosPage() {
  const token = (await cookies()).get(ADMIN_TOKEN_COOKIE)?.value;
  const data = (await adminFetch<ContenidosPayload>("/v1/admin/contenidos", token)) ?? {
    faqs: [],
    blog: [],
    legal: [],
    seo: [],
  };

  return (
    <div>
      <h1 className="font-serif text-3xl">Contenidos, FAQ, legal y SEO</h1>
      <p className="mt-2 text-[var(--muted)]">Actualizaciones reales sobre Prisma.</p>

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
              defaultValue: data.seo[0]?.path ?? "/",
              required: true,
            },
            {
              name: "title",
              label: "Title",
              defaultValue: data.seo[0]?.title ?? "",
              required: true,
            },
            {
              name: "description",
              label: "Description",
              type: "textarea",
              defaultValue: data.seo[0]?.description ?? "",
              required: true,
            },
            {
              name: "robots",
              label: "Robots",
              defaultValue: data.seo[0]?.robots ?? "noindex,nofollow",
            },
          ]}
        />
        <ul className="mt-3 space-y-1 text-sm text-[var(--muted)]">
          {data.seo.map((row) => (
            <li key={row.id}>
              {row.path} — {row.title}
            </li>
          ))}
        </ul>
      </AdminSection>

      <AdminSection title="FAQ">
        <div className="grid gap-4 lg:grid-cols-2">
          {data.faqs.map((faq) => (
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
      </AdminSection>

      <AdminSection title="Blog">
        <div className="grid gap-4 lg:grid-cols-2">
          {data.blog.map((post) => (
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
      </AdminSection>

      <AdminSection title="Legal">
        <div className="grid gap-4 lg:grid-cols-2">
          {data.legal.map((doc) => (
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
      </AdminSection>
    </div>
  );
}
