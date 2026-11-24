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
    "Vende, controla y haz crecer tu negocio con Camacho POS Colombia. Software local-first, planes comerciales y kits de equipos.",
  path: "/",
});

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

  return (
    <>
      <JsonLd data={faqJsonLd(faq.data.slice(0, 6).map((item) => ({ question: item.question, answer: item.answer })))} />
      {source === "draft" ? <DraftBanner source="draft" /> : null}

      <section className="relative overflow-hidden bg-[var(--navy)] text-[var(--ivory)]">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(circle at 20% 20%, rgba(247,200,60,0.35), transparent 40%), radial-gradient(circle at 80% 0%, rgba(22,129,119,0.35), transparent 35%)",
          }}
        />
        <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-28">
          <div className="reveal">
            <Image
              src="/brand/logo-yellow.png"
              alt="Camacho POS Colombia"
              width={320}
              height={115}
              className="mb-8 h-16 w-auto sm:h-20"
              priority
            />
            <h1 className="font-serif text-4xl leading-tight sm:text-5xl lg:text-[3.25rem]">
              Vende, controla y haz crecer tu negocio con Camacho POS Colombia
            </h1>
            <p className="mt-5 max-w-xl text-lg text-white/75">
              Software POS local-first y kits de equipos para tiendas, supermercados, droguerías, avícolas,
              panaderías y pastelerías. Contrata en línea; el cajero opera en Electron o Android.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/planes">
                <Button size="lg">Ver planes</Button>
              </Link>
              <Link href="/contacto">
                <Button size="lg" variant="outline" className="border-[var(--ivory)] text-[var(--ivory)] hover:bg-white/10">
                  Solicitar asesoría
                </Button>
              </Link>
              <Link href="/solicitar-demo">
                <Button size="lg" variant="ghost" className="text-[var(--yellow)] hover:bg-white/10">
                  Demo
                </Button>
              </Link>
            </div>
          </div>
          <div className="reveal-delay relative min-h-[280px]">
            <Image
              src="/images/software/pos-ui.svg"
              alt="Ilustración de la interfaz de caja Camacho POS"
              fill
              className="float-soft object-contain"
              sizes="(max-width:1024px) 100vw, 40vw"
              priority
            />
          </div>
        </div>
      </section>

      <Section
        eyebrow="Beneficios"
        title="Operación de mostrador sin drama de conectividad"
        lead="Local-first, roles claros y estados de capacidad transparentes. No vendemos lo que aún no está listo."
      >
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              title: "Venta aunque falle Internet",
              body: "El POS Local Service escribe en SQLite/WAL. La fila no se detiene por un corte breve.",
            },
            {
              title: "Roles sin confusión",
              body: "Superadmin comercial no es cajero. Administrador y supervisor tampoco. Cada perfil tiene su destino.",
            },
            {
              title: "Estados honestos",
              body: "Disponible, En certificación, Próximamente o No publicada. Sin fingir disponibilidad.",
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
        lead="Catálogo, venta, inventario, arqueo y reportes en una experiencia conectada a servicios reales — no a una maqueta."
      >
        <div className="editorial-grid">
          <div className="relative min-h-[260px] overflow-hidden rounded-lg bg-white/5 p-4">
            <Image src="/images/software/pos-ui.svg" alt="Presentación software POS" fill className="object-contain p-4" />
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
        lead="Puedes contratar el plan de software y usar tu hardware homologado, o armar un kit con terminal, impresora y periféricos."
      >
        <div className="grid gap-8 md:grid-cols-2">
          <article className="bg-white/60 p-6">
            <h3 className="font-serif text-2xl">Solo software</h3>
            <p className="mt-3 text-[var(--muted)]">
              Licencia, actualizaciones y soporte según plan. Instalación Electron o Android documentada en Descargas.
            </p>
            <Link href="/planes" className="mt-4 inline-block font-medium text-[var(--teal)] underline-offset-2 hover:underline">
              Ver planes
            </Link>
          </article>
          <article className="bg-[var(--navy)] p-6 text-[var(--ivory)]">
            <h3 className="font-serif text-2xl">Software + kit</h3>
            <p className="mt-3 text-white/75">
              Plan + equipos seleccionados del catálogo. El carrito consolida ítems reales con id de plan y equipo.
            </p>
            <Link href="/equipos" className="mt-4 inline-block font-medium text-[var(--yellow)] underline-offset-2 hover:underline">
              Ver equipos
            </Link>
          </article>
        </div>
      </Section>

      <Section eyebrow="Capacidades" title="Iconografía propia del producto" lead="Set SVG original para las áreas que importan en el mostrador y en la operación.">
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
        eyebrow="Demo de flujo"
        title="Del catálogo al ticket, sin inventar un POS web"
        lead="Esta web comercializa y contrata. La operación de cajero ocurre en la app instalada tras el alta."
      >
        <ol className="grid gap-4 md:grid-cols-4">
          {[
            "Elige plan y equipos",
            "Contrata o agenda demo",
            "Recibe instalación Electron/Android",
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

      <Section eyebrow="Planes" title="Licencias claras, precios en COP" lead="Los planes se cargan desde commercial-api. Si el API no responde en desarrollo, verás preview DRAFT.">
        <div className="grid gap-5 lg:grid-cols-3">
          {plans.data.filter((plan) => plan.status !== "no_publicada").map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </div>
      </Section>

      <Section eyebrow="Equipos" title="Hardware destacado" lead="Ilustraciones SVG propias; el modelo comercial exacto se confirma en la orden.">
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

      <Section tone="navy" eyebrow="Promociones" title="Ofertas vigentes" lead="Publicadas desde ajustes del API. Sin contadores falsos ni urgencia inventada.">
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
            { t: "Checkout", d: "Datos comerciales y pago vía API." },
            { t: "Instalación", d: "Descargas Electron/Android según rol." },
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
