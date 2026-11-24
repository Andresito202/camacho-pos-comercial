import Link from "next/link";
import { notFound } from "next/navigation";
import { getBlogPost, getBlogPosts } from "@/lib/api";
import { buildMetadata, breadcrumbJsonLd, JsonLd } from "@/lib/seo";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const posts = await getBlogPosts().catch(() => ({ data: [] as Array<{ slug: string }> }));
  return posts.data.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const { data } = await getBlogPost(slug);
  if (!data) return buildMetadata({ title: "Artículo", description: "No encontrado", path: `/blog/${slug}`, noIndex: true });
  return buildMetadata({ title: data.title, description: data.excerpt, path: `/blog/${data.slug}` });
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const { data } = await getBlogPost(slug);
  if (!data) notFound();
  return (
    <article className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <JsonLd data={breadcrumbJsonLd([{ name: "Inicio", path: "/" }, { name: "Blog", path: "/blog" }, { name: data.title, path: `/blog/${data.slug}` }])} />
      <p className="text-sm text-[var(--muted)]">{data.publishedAt} · {data.readingMinutes} min de lectura</p>
      <h1 className="mt-3 font-serif text-4xl">{data.title}</h1>
      <p className="mt-4 text-lg text-[var(--muted)]">{data.excerpt}</p>
      <div className="mt-8 space-y-4 text-[var(--steel)]">
        {data.body.map((p) => <p key={p}>{p}</p>)}
      </div>
      <Link href="/blog" className="mt-10 inline-block text-[var(--teal)] underline">Volver al blog</Link>
    </article>
  );
}
