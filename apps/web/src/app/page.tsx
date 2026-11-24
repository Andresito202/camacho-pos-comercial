import Image from "next/image";
import Link from "next/link";
import { Accordion, Button } from "@camacho-pos/ui";
import { DraftBanner } from "@/components/DraftBanner";
import { EquipmentCard } from "@/components/EquipmentCard";
import { FeatureIcon, featureIconCatalog } from "@/components/FeatureIcon";
import { PlanCard } from "@/components/PlanCard";
import { Section } from "@/components/Section";
import { StatusBadge } from "@/components/StatusBadge";
import {
  getCoverage,
  getEquipmentList,
  getFaq,
  getFeatures,
  getPlans,
  getPromotions,
  getSolutions,
} from "@/lib/api";
import { buildMetadata, faqJsonLd, JsonLd } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Camacho POS Colombia | Software POS y kits para tu negocio",
  description:
    "Vende, controla y haz crecer tu negocio con Camacho POS Colombia. Software POS, planes comerciales y kits de equipos para el comercio colombiano.",
  path: "/",
});

const SECTOR_STRIP = [
  { slug: "tiendas", name: "Tiendas" },
  { slug: "supermercados", name: "Supermercados" },
  { slug: "droguerias", name: "Droguerías" },
  { slug: "avicolas", name: "Avícolas" },
  { slug: "salsamentarias", name: "Salsamentarias" },
  { slug: "panaderias", name: "Panaderías" },
  { slug: "pastelerias", name: "Pastelerías" },
];

export default async function HomePage() {
  const [plans, equipment, promotions, coverage, solutions, faq, features] = await Promise.all([
    getPlans(),
    getEquipmentList(),
    getPromotions(),
    getCoverage(),
    getSolutions(),
    getFaq(),
    getFeatures(),
  ]);

  const source =
    plans.source === "draft" ||
    equipment.source === "draft" ||
    promotions.source === "draft" ||
    coverage.source === "draft"
      ? "draft"
      : "api";

  const faqLd = faqJsonLd(
    faq.data.slice(0, 6).map((item) => ({ question: item.question, answer: item.answer })),
  );

  return (
    <>
      {faqLd ? <JsonLd data={faqLd} /> : null}
      {source === "draft" ? <DraftBanner source="draft" /> : null}

      <section className="relative overflow-hidden bg-[var(--navy)] text-[var(--ivory)]">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at 12% 18%, rgba(247,200,60,0.42), transparent 46%), radial-gradient(ellipse at 88% 8%, rgba(22,129,119,0.28), transparent 40%), linear-gradient(160deg, #0c1624 0%, #101c2d 55%, #15253a 100%)",
          }}
        />
        <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/2 bg-[linear-gradient(90deg,transparent,rgba(246,245,240,0.04))] lg:block" />
        <div className="relative mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-24">
          <div className="reveal">
            <Image
              src="/brand/logo-yellow.png"
              alt="Camacho POS Colombia"
              width={420}
              height={150}
              className="mb-8 h-20 w-auto sm:h-24"
              priority
            />
            <h1 className="max-w-xl font-serif text-4xl leading-[1.08] sm:text-5xl lg:text-[3.35rem]">
              El POS que vende contigo, en el mostrador
            </h1>
            <p className="mt-5 max-w-xl text-lg text-white/90">
              Software y equipos para tiendas, supermercados, droguerías, avícolas, salsamentarias, panaderías y
              pastelerías. Contrata en línea; tu caja opera en Windows o Android.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/planes">
                <Button size="lg">Ver planes</Button>
              </Link>
              <Link href="/equipos">
                <Button size="lg" variant="outline" className="border-[var(--ivory)] text-[var(--ivory)] hover:bg-white/10">
                  Comprar equipos
                </Button>
              </Link>
              <Link href="/planes?solucion=completo">
                <Button size="lg" variant="ghost" className="text-[var(--yellow)] hover:bg-white/10">
                  POS completo
                </Button>
              </Link>
              <Link href="/solicitar-demo">
                <Button size="lg" variant="ghost" className="text-white/85 hover:bg-white/10">
                  Solicitar demo
                </Button>
              </Link>
              <Link href="/contacto">
                <Button size="lg" variant="ghost" className="text-white/85 hover:bg-white/10">
                  WhatsApp / asesor
                </Button>
              </Link>
            </div>
          </div>

          <div className="reveal-delay relative grid min-h-[300px] gap-4 sm:grid-cols-2 lg:min-h-[360px]">
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-3">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--yellow)]">Software</p>
              <div className="relative aspect-[4/3]">
                <Image
                  src="/images/software/pos-ui.svg"
                  alt="Ilustración referencial de la interfaz de caja Camacho POS"
                  fill
                  className="float-soft object-contain"
                  sizes="(max-width:1024px) 50vw, 22vw"
                  priority
                />
              </div>
            </div>
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[color-mix(in_srgb,var(--yellow)_12%,transparent)] p-3">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--yellow)]">Equipos</p>
              <div className="relative aspect-[4/3]">
                <Image
                  src="/images/hardware/terminal-tactil.svg"
                  alt="Ilustración referencial de terminal y periféricos"
                  fill
                  className="object-contain"
                  sizes="(max-width:1024px) 50vw, 22vw"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-[var(--border)] bg-[var(--ivory)]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 py-4 sm:px-6 lg:px-8">
          <p className="mr-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Sectores</p>
          {SECTOR_STRIP.map((sector) => (
            <Link
              key={sector.slug}
              href={`/soluciones/${sector.slug}`}
              className="inline-flex min-h-11 items-center rounded-md border border-[var(--border)] bg-white/80 px-3 py-2 text-sm font-medium text-[var(--navy)] transition hover:border-[var(--teal)] hover:text-[var(--teal)]"
            >
              {sector.name}
            </Link>
          ))}
        </div>
      </section>

      <Section
        eyebrow="Beneficios"
        title="Operación de mostrador sin drama de conectividad"
        lead="Vende aunque se interrumpa internet, con roles claros y estados de capacidad transparentes. No vendemos lo que aún no está listo."
      >
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              title: "Venta aunque falle Internet",
              body: "Tu caja sigue operando en el local. La fila no se detiene por un corte breve de red.",
            },
            {
              title: "Roles sin confusión",
              body: "Superadmin comercial no es cajero. Administrador y supervisor tampoco. Cada perfil tiene su destino.",
            },
            {
              title: "Estados honestos",
              body: "Disponible, En certificación, Próximamente o Pendiente de publicación. Sin fingir disponibilidad.",
            },
          ].map((item) => (
            <article key={item.title} className="border-l-4 border-[var(--teal)] pl-4">
              <h3 className="font-serif text-xl">{item.title}</h3>
              <p className="mt-2 text-[var(--muted)]">{item.body}</p>
            </article>
          ))}
        </div>
      </Section>

      <Section
        tone="navy"
        eyebrow="Software"
        title="Una caja pensada para el comercio colombiano"
        lead="Catálogo, venta, inventario, arqueo y reportes en una experiencia conectada a servicios reales."
      >
        <div className="editorial-grid">
          <div className="relative min-h-[260px] overflow-hidden rounded-lg bg-white/5 p-4">
            <Image src="/images/software/pos-ui.svg" alt="Ilustración referencial del software POS" fill className="object-contain p-4" />
          </div>
          <ul className="space-y-4 text-white/80">
            {features.data.map((feature) => (
              <li key={feature.id} className="flex items-start justify-between gap-4 border-b border-white/10 pb-3">
                <div>
                  <p className="font-medium text-[var(--ivory)]">{feature.name}</p>
                  <p className="text-sm text-white/65">{feature.description}</p>
                </div>
                <StatusBadge status={feature.status} />
              </li>
            ))}
          </ul>
        </div>
      </Section>

      <Section
        eyebrow="Software vs kit"
        title="Elige solo licencia o kit completo"
        lead="Puedes contratar el plan de software y usar tu hardware, o armar un kit con terminal, impresora y periféricos."
      >
        <div className="grid gap-8 md:grid-cols-2">
          <article className="bg-white/60 p-6">
            <h3 className="font-serif text-2xl">Solo software</h3>
            <p className="mt-3 text-[var(--muted)]">
              Licencia, actualizaciones y soporte según plan. Instalación en Windows o Android documentada en Descargas.
            </p>
            <Link href="/planes" className="mt-4 inline-block font-medium text-[var(--teal)] underline-offset-2 hover:underline">
              Ver planes
            </Link>
          </article>
          <article className="bg-[var(--navy)] p-6 text-[var(--ivory)]">
            <h3 className="font-serif text-2xl">Software + kit</h3>
            <p className="mt-3 text-white/75">
              Plan + equipos seleccionados del catálogo. El carrito consolida ítems reales con identificadores de plan y equipo.
            </p>
            <Link href="/equipos" className="mt-4 inline-block font-medium text-[var(--yellow)] underline-offset-2 hover:underline">
              Ver equipos
            </Link>
          </article>
        </div>
      </Section>

      <Section eyebrow="Capacidades" title="Áreas que importan en el mostrador" lead="Iconografía propia para las operaciones del día a día.">
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-9">
          {featureIconCatalog.map((item) => (
            <Link key={item.name} href={item.href} className="flex flex-col items-center gap-2 text-center text-sm font-medium">
              <FeatureIcon name={item.name} label={item.label} />
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      </Section>

      <Section
        tone="teal"
        eyebrow="Cómo funciona"
        title="Del catálogo al ticket, sin inventar un POS web"
        lead="Esta web comercializa y contrata. La operación de cajero ocurre en la app instalada tras el alta."
      >
        <ol className="grid gap-4 md:grid-cols-4">
          {[
            "Elige plan y equipos",
            "Contrata o agenda demo",
            "Recibe instalación Windows o Android",
            "Cajero opera en el dispositivo del kit",
          ].map((step, index) => (
            <li key={step} className="bg-white/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--teal)]">Paso {index + 1}</p>
              <p className="mt-2 font-serif text-xl">{step}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section eyebrow="Soluciones" title="Por tipo de negocio" lead="Cada sector tiene retos distintos. Mostramos capacidades con su estado real.">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {solutions.data.map((solution) => (
            <Link key={solution.slug} href={`/soluciones/${solution.slug}`} className="group block overflow-hidden bg-white/70">
              <div className="relative aspect-[16/10]">
                <Image src={solution.image} alt={solution.name} fill className="object-cover transition duration-500 group-hover:scale-[1.02]" />
              </div>
              <div className="p-5">
                <h3 className="font-serif text-2xl">{solution.name}</h3>
                <p className="mt-2 text-sm text-[var(--muted)]">{solution.headline}</p>
              </div>
            </Link>
          ))}
        </div>
      </Section>

      <Section eyebrow="Planes" title="Licencias claras, precios en COP" lead="Precios en pesos colombianos. Los precios de referencia se confirman al publicar la oferta comercial.">
        <div className="grid gap-5 lg:grid-cols-3">
          {plans.data.filter((plan) => plan.status !== "no_publicada").slice(0, 3).map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </div>
      </Section>

      <Section eyebrow="Equipos" title="Hardware destacado" lead="Ilustraciones referenciales; el modelo comercial exacto se confirma en la orden.">
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {equipment.data.filter((item) => item.featured).map((item) => (
            <EquipmentCard key={item.id} item={item} />
          ))}
        </div>
        <div className="mt-8">
          <Link href="/equipos">
            <Button variant="outline">Ver catálogo de equipos</Button>
          </Link>
        </div>
      </Section>

      <Section tone="navy" eyebrow="Promociones" title="Ofertas vigentes" lead="Publicadas desde ajustes del sitio. Sin contadores falsos ni urgencia inventada.">
        <div className="grid gap-4 md:grid-cols-2">
          {promotions.data.map((promo) => (
            <article key={promo.id} className="border border-white/15 p-6">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="font-serif text-2xl">{promo.title}</h3>
                <StatusBadge status={promo.status} />
              </div>
              <p className="text-white/75">{promo.summary}</p>
              {promo.validUntil ? (
                <p className="mt-3 text-sm text-white/55">Vigente hasta {promo.validUntil}</p>
              ) : null}
              <Link href={promo.ctaHref} className="mt-4 inline-block text-[var(--yellow)] underline-offset-2 hover:underline">
                {promo.ctaLabel}
              </Link>
            </article>
          ))}
        </div>
      </Section>

      <Section eyebrow="Cobertura" title="Ciudades con atención comercial" lead="Tiempos de entrega de hardware orientativos; se confirman al contratar.">
        <div className="flex flex-wrap gap-3">
          {coverage.data.map((city) => (
            <Link
              key={city.slug}
              href={`/cobertura/${city.slug}`}
              className="border border-[var(--border)] bg-white/70 px-4 py-3 text-sm font-medium hover:border-[var(--teal)]"
            >
              {city.name}
              <span className="ml-2 text-[var(--muted)]">· {city.leadTimeDays} días</span>
            </Link>
          ))}
        </div>
      </Section>

      <Section eyebrow="Contratación" title="Cómo contratar" lead="Cuatro pasos sin formularios decorativos.">
        <ol className="grid gap-4 md:grid-cols-4">
          {[
            { t: "Elige", d: "Plan y equipos con estado Disponible." },
            { t: "Carrito", d: "Revisa cantidades y subtotal en COP." },
            { t: "Checkout", d: "Datos comerciales y pago en línea." },
            { t: "Instalación", d: "Descargas Windows o Android según rol." },
          ].map((step, i) => (
            <li key={step.t} className="bg-white/70 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--yellow)] bg-[var(--navy)] inline-block px-2 py-1">
                0{i + 1}
              </p>
              <h3 className="mt-3 font-serif text-xl">{step.t}</h3>
              <p className="mt-2 text-sm text-[var(--muted)]">{step.d}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section eyebrow="Garantías y soporte" title="Acompañamiento después de la venta" lead="Garantía de equipos según proveedor, soporte de software según plan, y canal WhatsApp comercial.">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { t: "Garantía de hardware", d: "Condiciones publicadas en Legal / Garantías y confirmadas en la orden." },
            { t: "Soporte de software", d: "Actualizaciones de seguridad y mesa de ayuda según el plan." },
            { t: "Capacitación", d: "Sesión de arranque remota para el equipo de caja." },
          ].map((item) => (
            <article key={item.t}>
              <h3 className="font-serif text-xl">{item.t}</h3>
              <p className="mt-2 text-[var(--muted)]">{item.d}</p>
            </article>
          ))}
        </div>
      </Section>

      <Section eyebrow="FAQ" title="Preguntas frecuentes">
        <Accordion
          items={faq.data.map((item) => ({
            id: item.id,
            title: item.question,
            content: <p>{item.answer}</p>,
          }))}
        />
        <div className="mt-6">
          <Link href="/preguntas-frecuentes" className="font-medium text-[var(--teal)] underline-offset-2 hover:underline">
            Ver todas las preguntas
          </Link>
        </div>
      </Section>

      <Section tone="navy" eyebrow="Contacto" title="Hablemos de tu punto de venta" lead="Asesoría comercial, demos y seguimiento de pedidos.">
        <div className="flex flex-wrap gap-3">
          <Link href="/contacto">
            <Button size="lg">Contacto</Button>
          </Link>
          <Link href="/solicitar-demo">
            <Button size="lg" variant="outline" className="border-[var(--ivory)] text-[var(--ivory)]">
              Solicitar demo
            </Button>
          </Link>
          <Link href="/contratar">
            <Button size="lg" variant="ghost" className="text-[var(--yellow)]">
              Contratar ahora
            </Button>
          </Link>
        </div>
      </Section>
    </>
  );
}
