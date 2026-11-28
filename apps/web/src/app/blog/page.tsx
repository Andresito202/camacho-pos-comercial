import Link from "next/link";
import { getBlogPosts } from "@/lib/api";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Blog",
  description: "Artículos de Camacho POS Colombia sobre operación de caja, kits por sector y roles.",
  path: "/blog",
});

export default async function BlogPage() {
  const posts = await getBlogPosts();
  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <h1 className="font-serif text-4xl">Blog</h1>
      <p className="mt-3 text-[var(--muted)]">Contenido editorial propio. Sin reseñas inventadas.</p>
      <ul className="mt-10 space-y-8">
        {posts.data.map((post) => (
          <li key={post.slug} className="border-b border-[var(--border)] pb-8">
            <p className="text-xs text-[var(--muted)]">{post.publishedAt} · {post.readingMinutes} min</p>
            <h2 className="mt-2 font-serif text-2xl">
              <Link href={`/blog/${post.slug}`} className="hover:underline">{post.title}</Link>
            </h2>
            <p className="mt-2 text-[var(--steel)]">{post.excerpt}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span key={tag} className="text-xs uppercase tracking-wide text-[var(--teal)]">{tag}</span>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
