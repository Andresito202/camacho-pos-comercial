import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@camacho-pos/ui";
import { StatusBadge } from "@/components/StatusBadge";
import { getCoverage, getCoverageCity } from "@/lib/api";
import { buildMetadata, breadcrumbJsonLd, JsonLd } from "@/lib/seo";

type Props = { params: Promise<{ ciudad: string }> };

export async function generateStaticParams() {
  const list = await getCoverage().catch(() => ({ data: [] as Array<{ slug: string }> }));
  return list.data.map((city) => ({ ciudad: city.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { ciudad } = await params;
  const { data } = await getCoverageCity(ciudad);
  if (!data) return buildMetadata({ title: "Cobertura", description: "Ciudad no encontrada", path: `/cobertura/${ciudad}`, noIndex: true });
  return buildMetadata({ title: `Cobertura en ${data.name}`, description: data.summary, path: `/cobertura/${data.slug}` });
}

export default async function CoverageCityPage({ params }: Props) {
  const { ciudad } = await params;
  const { data } = await getCoverageCity(ciudad);
  if (!data) notFound();
  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <JsonLd data={breadcrumbJsonLd([{ name: "Inicio", path: "/" }, { name: "Cobertura", path: "/cobertura" }, { name: data.name, path: `/cobertura/${data.slug}` }])} />
      <StatusBadge status={data.status} />
      <h1 className="mt-4 font-serif text-4xl">{data.name}</h1>
      <p className="mt-2 text-[var(--muted)]">{data.department}</p>
      <p className="mt-6 text-lg text-[var(--steel)]">{data.summary}</p>
      <p className="mt-4 text-sm text-[var(--muted)]">Tiempo orientativo de entrega de hardware: {data.leadTimeDays} días hábiles tras confirmación de pago.</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href={`/contratar?ciudad=${data.slug}`}><Button>Contratar en {data.name}</Button></Link>
        <Link href="/prueba-5-dias"><Button variant="outline">Prueba 5 días</Button></Link>
      </div>
    </div>
  );
}
