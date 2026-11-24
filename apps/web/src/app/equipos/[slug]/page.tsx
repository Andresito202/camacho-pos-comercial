import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@camacho-pos/ui";
import { AddEquipmentButton } from "@/components/AddEquipmentButton";
import { StatusBadge } from "@/components/StatusBadge";
import { getEquipment, getEquipmentList } from "@/lib/api";
import { formatMoney, isPubliclySellable } from "@/lib/format";
import { buildMetadata, breadcrumbJsonLd, JsonLd, productJsonLd } from "@/lib/seo";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const list = await getEquipmentList().catch(() => ({ data: [] as Array<{ slug: string }> }));
  return list.data.map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const { data } = await getEquipment(slug);
  if (!data) return buildMetadata({ title: "Equipo", description: "Equipo no encontrado", path: `/equipos/${slug}`, noIndex: true });
  return buildMetadata({ title: data.name, description: data.summary, path: `/equipos/${data.slug}` });
}

export default async function EquipmentDetailPage({ params }: Props) {
  const { slug } = await params;
  const { data: item } = await getEquipment(slug);
  if (!item || item.status === "no_publicada") notFound();
  const availability = isPubliclySellable(item.status) ? "InStock" : item.status === "proximamente" ? "PreOrder" : "OutOfStock";
  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 lg:grid-cols-2 sm:px-6">
      <JsonLd data={[
        breadcrumbJsonLd([{ name: "Inicio", path: "/" }, { name: "Equipos", path: "/equipos" }, { name: item.name, path: `/equipos/${item.slug}` }]),
        productJsonLd({ name: item.name, description: item.description, path: `/equipos/${item.slug}`, sku: item.id, priceCents: item.price.amountCents, availability }),
      ]} />
      <div className="relative min-h-[280px] bg-[var(--ivory)]">
        <Image src={item.image} alt={item.name} fill className="object-contain p-4" />
      </div>
      <div>
        <StatusBadge status={item.status} />
        <p className="mt-3 text-xs uppercase tracking-[0.14em] text-[var(--teal)]">{item.category}</p>
        <h1 className="mt-2 font-serif text-4xl">{item.name}</h1>
        <p className="mt-4 text-[var(--muted)]">{item.summary}</p>
        <p className="mt-6 font-serif text-3xl">{formatMoney(item.price)}</p>
        <p className="mt-6 text-[var(--steel)]">{item.description}</p>
        <ul className="mt-6 list-disc space-y-1 pl-5 text-sm text-[var(--steel)]">
          {item.specs.map((s) => <li key={s}>{s}</li>)}
        </ul>
        <div className="mt-8 flex flex-wrap gap-3">
          {isPubliclySellable(item.status) ? <AddEquipmentButton item={item} /> : <Button disabled>No disponible para compra</Button>}
          <Link href="/carrito"><Button variant="outline">Ir al carrito</Button></Link>
        </div>
        <p className="mt-4 text-xs text-[var(--muted)]">Ilustración SVG — no fotografía de producto. Id: {item.id}</p>
      </div>
    </div>
  );
}
