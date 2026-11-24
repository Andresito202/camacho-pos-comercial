import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@camacho-pos/ui";
import { getSolution, getSolutions } from "@/lib/api";
import { buildMetadata, breadcrumbJsonLd, JsonLd } from "@/lib/seo";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const list = await getSolutions().catch(() => ({ data: [] as Array<{ slug: string }> }));
  return list.data.map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const { data } = await getSolution(slug);
  if (!data) return buildMetadata({ title: "Solución", description: "Sector no encontrado", path: `/soluciones/${slug}`, noIndex: true });
  return buildMetadata({ title: `Soluciones para ${data.name}`, description: data.summary, path: `/soluciones/${data.slug}` });
}

export default async function SolutionDetailPage({ params }: Props) {
  const { slug } = await params;
  const { data } = await getSolution(slug);
  if (!data) notFound();
  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
      <JsonLd data={breadcrumbJsonLd([{ name: "Inicio", path: "/" }, { name: "Soluciones", path: "/soluciones" }, { name: data.name, path: `/soluciones/${data.slug}` }])} />
      <div className="grid gap-10 lg:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--teal)]">Solución</p>
          <h1 className="mt-3 font-serif text-4xl">{data.headline}</h1>
          <p className="mt-4 text-lg text-[var(--muted)]">{data.summary}</p>
          <h2 className="mt-8 font-serif text-2xl">Retos del sector</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-[var(--steel)]">{data.challenges.map((c) => <li key={c}>{c}</li>)}</ul>
          <h2 className="mt-8 font-serif text-2xl">Capacidades</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-[var(--steel)]">{data.capabilities.map((c) => <li key={c}>{c}</li>)}</ul>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/solicitar-demo"><Button>Solicitar demo</Button></Link>
            <Link href="/planes"><Button variant="outline">Ver planes</Button></Link>
          </div>
        </div>
        <div className="relative min-h-[280px]"><Image src={data.image} alt={data.name} fill className="object-contain" /></div>
      </div>
    </div>
  );
}
