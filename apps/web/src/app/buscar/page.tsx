import Link from "next/link";
import { getBlogPosts, getCoverage, getEquipmentList, getPlans, getSolutions } from "@/lib/api";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Buscar",
  description: "Busca planes, equipos, soluciones y artículos en Camacho POS Colombia.",
  path: "/buscar",
});

type Props = { searchParams: Promise<{ q?: string }> };

export default async function BuscarPage({ searchParams }: Props) {
  const { q = "" } = await searchParams;
  const query = q.trim().toLowerCase();
  const [plans, equipment, solutions, coverage, blog] = await Promise.all([
    getPlans(), getEquipmentList(), getSolutions(), getCoverage(), getBlogPosts(),
  ]);

  const results = query
    ? [
        ...plans.data.filter((p) => `${p.name} ${p.tagline}`.toLowerCase().includes(query)).map((p) => ({ href: `/planes/${p.slug}`, label: p.name, kind: "Plan" })),
        ...equipment.data.filter((e) => `${e.name} ${e.summary}`.toLowerCase().includes(query)).map((e) => ({ href: `/equipos/${e.slug}`, label: e.name, kind: "Equipo" })),
        ...solutions.data.filter((s) => `${s.name} ${s.summary}`.toLowerCase().includes(query)).map((s) => ({ href: `/soluciones/${s.slug}`, label: s.name, kind: "Solución" })),
        ...coverage.data.filter((c) => `${c.name} ${c.department}`.toLowerCase().includes(query)).map((c) => ({ href: `/cobertura/${c.slug}`, label: c.name, kind: "Cobertura" })),
        ...blog.data.filter((b) => `${b.title} ${b.excerpt}`.toLowerCase().includes(query)).map((b) => ({ href: `/blog/${b.slug}`, label: b.title, kind: "Blog" })),
      ]
    : [];

  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <h1 className="font-serif text-4xl">Buscar</h1>
      <form className="mt-6 flex gap-2" action="/buscar" method="get">
        <label className="sr-only" htmlFor="q">Consulta</label>
        <input id="q" name="q" defaultValue={q} placeholder="Ej. panadería, Bogotá, impresora" className="w-full rounded-md border border-[var(--border)] px-3 py-2.5" />
        <button type="submit" className="rounded-md bg-[var(--yellow)] px-4 py-2.5 font-medium text-[var(--navy)]">Buscar</button>
      </form>
      {query ? (
        <ul className="mt-8 divide-y divide-[var(--border)]">
          {results.length === 0 ? <li className="py-6 text-[var(--muted)]">Sin resultados para “{q}”.</li> : null}
          {results.map((item) => (
            <li key={item.href} className="py-4">
              <p className="text-xs uppercase tracking-wide text-[var(--teal)]">{item.kind}</p>
              <Link href={item.href} className="font-serif text-xl hover:underline">{item.label}</Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-6 text-[var(--muted)]">Escribe un término para buscar en el catálogo y el blog.</p>
      )}
    </div>
  );
}
