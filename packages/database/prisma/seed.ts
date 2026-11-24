/**
 * Provisional DRAFT commercial catalog seed.
 * Prices are DRAFT — real charges disabled until approved.
 * WhatsApp number is a DEV PLACEHOLDER.
 */
import { PrismaClient, PublicationStatus, FeatureCommercialStatus, BillingInterval, ProductKind, LegalDocumentType } from "@prisma/client";

const prisma = new PrismaClient();

/** Major Colombian cities — DIVIPOLA subset. */
const DIVIPOLA: Array<{ deptId: string; deptName: string; cities: Array<{ id: string; name: string }> }> = [
  { deptId: "11", deptName: "Bogotá, D.C.", cities: [{ id: "11001", name: "Bogotá, D.C." }] },
  {
    deptId: "05",
    deptName: "Antioquia",
    cities: [
      { id: "05001", name: "Medellín" },
      { id: "05088", name: "Bello" },
      { id: "05360", name: "Itagüí" },
      { id: "05266", name: "Envigado" },
    ],
  },
  {
    deptId: "76",
    deptName: "Valle del Cauca",
    cities: [
      { id: "76001", name: "Cali" },
      { id: "76109", name: "Buenaventura" },
      { id: "76520", name: "Palmira" },
    ],
  },
  { deptId: "08", deptName: "Atlántico", cities: [{ id: "08001", name: "Barranquilla" }, { id: "08758", name: "Soledad" }] },
  { deptId: "13", deptName: "Bolívar", cities: [{ id: "13001", name: "Cartagena de Indias" }] },
  { deptId: "68", deptName: "Santander", cities: [{ id: "68001", name: "Bucaramanga" }, { id: "68276", name: "Floridablanca" }] },
  { deptId: "66", deptName: "Risaralda", cities: [{ id: "66001", name: "Pereira" }, { id: "66170", name: "Dosquebradas" }] },
  { deptId: "17", deptName: "Caldas", cities: [{ id: "17001", name: "Manizales" }] },
  { deptId: "73", deptName: "Tolima", cities: [{ id: "73001", name: "Ibagué" }] },
  { deptId: "47", deptName: "Magdalena", cities: [{ id: "47001", name: "Santa Marta" }] },
  { deptId: "54", deptName: "Norte de Santander", cities: [{ id: "54001", name: "Cúcuta" }] },
  { deptId: "50", deptName: "Meta", cities: [{ id: "50001", name: "Villavicencio" }] },
  { deptId: "52", deptName: "Nariño", cities: [{ id: "52001", name: "Pasto" }] },
  { deptId: "23", deptName: "Córdoba", cities: [{ id: "23001", name: "Montería" }] },
  { deptId: "41", deptName: "Huila", cities: [{ id: "41001", name: "Neiva" }] },
  { deptId: "63", deptName: "Quindío", cities: [{ id: "63001", name: "Armenia" }] },
  { deptId: "70", deptName: "Sucre", cities: [{ id: "70001", name: "Sincelejo" }] },
  { deptId: "20", deptName: "Cesar", cities: [{ id: "20001", name: "Valledupar" }] },
  { deptId: "19", deptName: "Cauca", cities: [{ id: "19001", name: "Popayán" }] },
  { deptId: "15", deptName: "Boyacá", cities: [{ id: "15001", name: "Tunja" }] },
];

const FEATURE_MATRIX: Array<{
  code: string;
  label: string;
  description: string;
  status: FeatureCommercialStatus;
  claimNote: string;
  plans: string[];
}> = [
  {
    code: "local_first_sales",
    label: "Ventas local-first",
    description: "Venta ordinaria autorizada sin depender de Internet",
    status: FeatureCommercialStatus.AVAILABLE,
    claimNote: "AVAILABLE as commercial claim only where verified from POS runtime evidence; not a blanket production certification.",
    plans: ["esencial", "profesional", "empresarial", "perpetua"],
  },
  {
    code: "sqlite_single_writer",
    label: "SQLite single-writer",
    description: "POS Local Service como único writer SQLite/WAL",
    status: FeatureCommercialStatus.AVAILABLE,
    claimNote: "Claim limited to architectures already implemented in POS; commercial portal does not re-verify.",
    plans: ["esencial", "profesional", "empresarial", "perpetua"],
  },
  {
    code: "multi_caja",
    label: "Multi-caja",
    description: "Más de una caja por sucursal (1 licencia = 1 caja)",
    status: FeatureCommercialStatus.AVAILABLE,
    claimNote: "Licensing rule: one license equals one caja unless a signed contract says otherwise.",
    plans: ["profesional", "empresarial", "perpetua"],
  },
  {
    code: "inventory",
    label: "Inventario",
    description: "Movimientos append-only de inventario",
    status: FeatureCommercialStatus.AVAILABLE,
    claimNote: "Status reflects POS domain capability documentation; portal sale does not prove deployment.",
    plans: ["esencial", "profesional", "empresarial", "perpetua"],
  },
  {
    code: "central_sync",
    label: "Central Sync",
    description: "Sincronización outbox/inbox con backend central",
    status: FeatureCommercialStatus.IN_CERTIFICATION,
    claimNote: "Persistence gate exists on POS line; commercial claim stays IN_CERTIFICATION until portal E2E evidence.",
    plans: ["profesional", "empresarial", "perpetua"],
  },
  {
    code: "factus_electronic_invoice",
    label: "Facturación electrónica FACTUS",
    description: "Emisión electrónica vía adapter FACTUS",
    status: FeatureCommercialStatus.IN_CERTIFICATION,
    claimNote: "Adapter path exists in POS; commercial portal sales of FACTUS remain IN_CERTIFICATION.",
    plans: ["profesional", "empresarial", "perpetua"],
  },
  {
    code: "factus_pay",
    label: "FACTUS Pay",
    description: "Cobros QR / colecciones FACTUS Pay",
    status: FeatureCommercialStatus.IN_CERTIFICATION,
    claimNote: "FACTUS Pay for commercial portal sales is IN_CERTIFICATION. Sandbox mock only until credentials + approval.",
    plans: ["profesional", "empresarial", "perpetua"],
  },
  {
    code: "reporting",
    label: "Reportes",
    description: "Reportes operativos por sucursal",
    status: FeatureCommercialStatus.COMING_SOON,
    claimNote: "Not claimed as commercially available until product evidence exists.",
    plans: ["empresarial", "perpetua"],
  },
  {
    code: "multi_branch",
    label: "Multi-sucursal",
    description: "Operación multi-sucursal con ownership por contexto",
    status: FeatureCommercialStatus.COMING_SOON,
    claimNote: "Commercial matrix marks COMING_SOON pending verified packaging.",
    plans: ["empresarial", "perpetua"],
  },
  {
    code: "android_companion",
    label: "Companion Android",
    description: "App companion Android",
    status: FeatureCommercialStatus.UNPUBLISHED,
    claimNote: "Unpublished until product decision and evidence.",
    plans: ["empresarial", "perpetua"],
  },
];

async function seedGeo() {
  for (const dept of DIVIPOLA) {
    await prisma.department.upsert({
      where: { id: dept.deptId },
      create: { id: dept.deptId, name: dept.deptName },
      update: { name: dept.deptName },
    });
    for (const city of dept.cities) {
      await prisma.city.upsert({
        where: { id: city.id },
        create: { id: city.id, name: city.name, departmentId: dept.deptId },
        update: { name: city.name, departmentId: dept.deptId },
      });
    }
  }

  const bogota = await prisma.city.findUniqueOrThrow({ where: { id: "11001" } });
  await prisma.coverageZone.upsert({
    where: { code: "bogota-metro" },
    create: {
      code: "bogota-metro",
      name: "Bogotá y área metropolitana",
      cityId: bogota.id,
      publicationStatus: PublicationStatus.DRAFT,
      rates: {
        create: {
          name: "Envío estándar Bogotá (provisional)",
          amountCents: 25000,
          minDays: 2,
          maxDays: 5,
          publicationStatus: PublicationStatus.DRAFT,
        },
      },
    },
    update: { name: "Bogotá y área metropolitana" },
  });
}

async function seedPlans() {
  const plans = [
    {
      slug: "esencial",
      name: "Esencial",
      tagline: "Caja local-first para un punto de venta",
      description: "Plan base: una licencia = una caja. Precios provisionales DRAFT.",
      sortOrder: 1,
      monthly: 49900,
      annual: 499000,
    },
    {
      slug: "profesional",
      name: "Profesional",
      tagline: "Operación con sync y pagos en certificación",
      description: "Incluye capacidades en certificación (Central Sync, FACTUS). Precios provisionales DRAFT.",
      sortOrder: 2,
      monthly: 79900,
      annual: 799000,
    },
    {
      slug: "empresarial",
      name: "Empresarial",
      tagline: "Multi-caja y expansión",
      description: "Para operaciones con más cajas y roadmap multi-sucursal. Precios provisionales DRAFT.",
      sortOrder: 3,
      monthly: 119900,
      annual: 1199000,
    },
    {
      slug: "perpetua",
      name: "Perpetua",
      tagline: "Licencia perpetua (pago único)",
      description: "Oferta perpetua provisional. Una licencia = una caja. Precio DRAFT.",
      sortOrder: 4,
      monthly: null as number | null,
      annual: null as number | null,
      perpetual: 1490000,
    },
  ];

  for (const p of plans) {
    const plan = await prisma.plan.upsert({
      where: { slug: p.slug },
      create: {
        slug: p.slug,
        name: p.name,
        tagline: p.tagline,
        description: p.description,
        sortOrder: p.sortOrder,
        publicationStatus: PublicationStatus.DRAFT,
        licensesPerUnit: 1,
      },
      update: {
        name: p.name,
        tagline: p.tagline,
        description: p.description,
        publicationStatus: PublicationStatus.DRAFT,
      },
    });

    if (p.monthly != null) {
      await upsertPlanPrice(plan.id, BillingInterval.MONTHLY, p.monthly);
    }
    if (p.annual != null) {
      await upsertPlanPrice(plan.id, BillingInterval.ANNUAL, p.annual);
    }
    if ("perpetual" in p && p.perpetual != null) {
      await upsertPlanPrice(plan.id, BillingInterval.PERPETUAL, p.perpetual);
    }

    await prisma.licenseOffering.upsert({
      where: { code: `${p.slug}-1-caja` },
      create: {
        planId: plan.id,
        code: `${p.slug}-1-caja`,
        name: `${p.name} — 1 caja`,
        maxCajas: 1,
        publicationStatus: PublicationStatus.DRAFT,
      },
      update: { name: `${p.name} — 1 caja`, publicationStatus: PublicationStatus.DRAFT },
    });
  }

  for (const feature of FEATURE_MATRIX) {
    for (const planSlug of feature.plans) {
      const plan = await prisma.plan.findUniqueOrThrow({ where: { slug: planSlug } });
      await prisma.planFeature.upsert({
        where: { planId_code: { planId: plan.id, code: feature.code } },
        create: {
          planId: plan.id,
          code: feature.code,
          label: feature.label,
          description: feature.description,
          commercialStatus: feature.status,
          claimNote: feature.claimNote,
        },
        update: {
          label: feature.label,
          description: feature.description,
          commercialStatus: feature.status,
          claimNote: feature.claimNote,
        },
      });
    }
  }
}

async function upsertPlanPrice(planId: string, interval: BillingInterval, amountCents: number) {
  const existing = await prisma.planPrice.findFirst({
    where: { planId, billingInterval: interval, version: 1 },
  });
  if (existing) {
    await prisma.planPrice.update({
      where: { id: existing.id },
      data: {
        amountCents,
        publicationStatus: PublicationStatus.DRAFT,
      },
    });
    await prisma.planPriceHistory.create({
      data: {
        planPriceId: existing.id,
        amountCents,
        reason: "seed-refresh",
        changedBy: "seed",
      },
    });
    return;
  }
  const price = await prisma.planPrice.create({
    data: {
      planId,
      version: 1,
      billingInterval: interval,
      amountCents,
      publicationStatus: PublicationStatus.DRAFT,
      history: {
        create: {
          amountCents,
          reason: "initial-seed",
          changedBy: "seed",
        },
      },
    },
  });
  return price;
}

async function seedKits() {
  const category = await prisma.productCategory.upsert({
    where: { slug: "kits-pos" },
    create: {
      slug: "kits-pos",
      name: "Kits POS",
      description: "Kits de hardware + licencia (precios DRAFT)",
      publicationStatus: PublicationStatus.DRAFT,
    },
    update: { publicationStatus: PublicationStatus.DRAFT },
  });

  const kits = [
    { slug: "kit-esencial", name: "Kit Esencial", amount: 899000, sku: "KIT-ESENCIAL" },
    { slug: "kit-profesional", name: "Kit Profesional", amount: 1690000, sku: "KIT-PROFESIONAL" },
    { slug: "kit-comercial-plus", name: "Kit Comercial Plus", amount: 2490000, sku: "KIT-COMERCIAL-PLUS" },
  ];

  for (const k of kits) {
    const product = await prisma.product.upsert({
      where: { slug: k.slug },
      create: {
        slug: k.slug,
        sku: k.sku,
        name: k.name,
        description: `${k.name} — precio provisional DRAFT. No cobrable hasta aprobación.`,
        kind: ProductKind.KIT,
        categoryId: category.id,
        publicationStatus: PublicationStatus.DRAFT,
      },
      update: {
        name: k.name,
        publicationStatus: PublicationStatus.DRAFT,
        categoryId: category.id,
      },
    });

    const variant = await prisma.productVariant.upsert({
      where: { sku: `${k.sku}-STD` },
      create: {
        productId: product.id,
        sku: `${k.sku}-STD`,
        name: "Estándar",
        amountCents: k.amount,
        version: 1,
        publicationStatus: PublicationStatus.DRAFT,
        stock: { create: { quantityOnHand: 0, trackInventory: true } },
        history: { create: { amountCents: k.amount, reason: "initial-seed", changedBy: "seed" } },
      },
      update: {
        amountCents: k.amount,
        publicationStatus: PublicationStatus.DRAFT,
      },
    });

    await prisma.kit.upsert({
      where: { slug: k.slug },
      create: {
        productId: product.id,
        slug: k.slug,
        name: k.name,
        description: `${k.name} provisional. Incluye hardware de referencia + 1 licencia (1 caja).`,
        amountCents: k.amount,
        priceVersion: 1,
        publicationStatus: PublicationStatus.DRAFT,
        items: {
          create: {
            productVariantId: variant.id,
            quantity: 1,
          },
        },
        history: {
          create: { amountCents: k.amount, reason: "initial-seed", changedBy: "seed" },
        },
      },
      update: {
        amountCents: k.amount,
        publicationStatus: PublicationStatus.DRAFT,
        name: k.name,
      },
    });
  }

  // Standalone hardware sample (DRAFT)
  const hwCat = await prisma.productCategory.upsert({
    where: { slug: "hardware" },
    create: {
      slug: "hardware",
      name: "Hardware",
      publicationStatus: PublicationStatus.DRAFT,
    },
    update: {},
  });
  const printer = await prisma.product.upsert({
    where: { slug: "impresora-termica-80mm" },
    create: {
      slug: "impresora-termica-80mm",
      sku: "HW-PRINT-80",
      name: "Impresora térmica 80mm",
      description: "Referencia de catálogo DRAFT — precio no cobrable.",
      kind: ProductKind.HARDWARE,
      categoryId: hwCat.id,
      publicationStatus: PublicationStatus.DRAFT,
      variants: {
        create: {
          sku: "HW-PRINT-80-STD",
          name: "Estándar",
          amountCents: 350000,
          version: 1,
          publicationStatus: PublicationStatus.DRAFT,
          stock: { create: { quantityOnHand: 0 } },
          history: { create: { amountCents: 350000, reason: "initial-seed", changedBy: "seed" } },
        },
      },
    },
    update: { publicationStatus: PublicationStatus.DRAFT },
  });
  void printer;
}

async function seedContent() {
  await prisma.siteSettings.upsert({
    where: { key: "default" },
    create: {
      key: "default",
      brandName: "Camacho POS Colombia",
      domain: "camachoposcolombia.com",
      primaryColor: "#0B3D2E",
      secondaryColor: "#F5C518",
      accentColor: "#1A5C45",
      whatsappNumber: "573000000000_DEV_PLACEHOLDER",
      supportEmail: "soporte@camachoposcolombia.com",
      logoUrl: "/brand/logo-stacked.png",
      publicationStatus: PublicationStatus.DRAFT,
    },
    update: {
      brandName: "Camacho POS Colombia",
      domain: "camachoposcolombia.com",
      primaryColor: "#0B3D2E",
      secondaryColor: "#F5C518",
      accentColor: "#1A5C45",
      whatsappNumber: "573000000000_DEV_PLACEHOLDER",
      publicationStatus: PublicationStatus.DRAFT,
    },
  });

  await prisma.socialLink.upsert({
    where: { platform_url: { platform: "whatsapp", url: "https://wa.me/573000000000" } },
    create: {
      platform: "whatsapp",
      url: "https://wa.me/573000000000",
      sortOrder: 1,
      publicationStatus: PublicationStatus.DRAFT,
    },
    update: { publicationStatus: PublicationStatus.DRAFT },
  });

  await prisma.faq.upsert({
    where: { slug: "que-incluye-una-licencia" },
    create: {
      slug: "que-incluye-una-licencia",
      question: "¿Qué incluye una licencia?",
      answer: "Una licencia corresponde a una caja (punto de venta), salvo que un contrato firmado indique otra cosa. Los precios publicados en borrador no autorizan cobro real.",
      category: "licencias",
      publicationStatus: PublicationStatus.DRAFT,
    },
    update: { publicationStatus: PublicationStatus.DRAFT },
  });

  await prisma.blogPost.upsert({
    where: { slug: "bienvenida-camacho-pos" },
    create: {
      slug: "bienvenida-camacho-pos",
      title: "Camacho POS Colombia — portal comercial (borrador)",
      excerpt: "Contenido provisional DRAFT.",
      body: "Este artículo es un marcador DRAFT del portal comercial. No constituye oferta vinculante.",
      publicationStatus: PublicationStatus.DRAFT,
    },
    update: { publicationStatus: PublicationStatus.DRAFT },
  });

  const legal = [
    {
      type: LegalDocumentType.TERMS,
      slug: "terminos-condiciones",
      title: "Términos y condiciones (borrador)",
      body: "DOCUMENTO LEGAL EN ESTADO DRAFT. No constituye términos vinculantes hasta publicación aprobada.",
      version: "0.1.0-draft",
    },
    {
      type: LegalDocumentType.PRIVACY,
      slug: "politica-privacidad",
      title: "Política de privacidad (borrador)",
      body: "DOCUMENTO LEGAL EN ESTADO DRAFT. Tratamiento de datos pendiente de aprobación jurídica.",
      version: "0.1.0-draft",
    },
    {
      type: LegalDocumentType.COOKIES,
      slug: "politica-cookies",
      title: "Política de cookies (borrador)",
      body: "DOCUMENTO LEGAL EN ESTADO DRAFT.",
      version: "0.1.0-draft",
    },
    {
      type: LegalDocumentType.LICENSE,
      slug: "contrato-licencia",
      title: "Contrato de licencia de software (borrador)",
      body: "DOCUMENTO LEGAL EN ESTADO DRAFT. Una licencia = una caja salvo pacto en contrario.",
      version: "0.1.0-draft",
    },
  ];

  for (const doc of legal) {
    await prisma.legalDocument.upsert({
      where: { slug: doc.slug },
      create: {
        ...doc,
        publicationStatus: PublicationStatus.DRAFT,
      },
      update: {
        title: doc.title,
        body: doc.body,
        version: doc.version,
        publicationStatus: PublicationStatus.DRAFT,
      },
    });
  }

  await prisma.seoMetadata.upsert({
    where: { path: "/" },
    create: {
      path: "/",
      title: "Camacho POS Colombia",
      description: "Punto de venta local-first para Colombia. Precios y contenidos en borrador.",
      canonicalUrl: "https://camachoposcolombia.com/",
      robots: "noindex,nofollow",
    },
    update: {
      title: "Camacho POS Colombia",
      robots: "noindex,nofollow",
    },
  });

  // Expired coupon for tests / demo of rejection path
  await prisma.coupon.upsert({
    where: { code: "EXPIRED10" },
    create: {
      code: "EXPIRED10",
      type: "PERCENT",
      percentOff: 10,
      active: true,
      startsAt: new Date("2020-01-01T00:00:00.000Z"),
      endsAt: new Date("2020-12-31T23:59:59.000Z"),
    },
    update: {
      endsAt: new Date("2020-12-31T23:59:59.000Z"),
      active: true,
    },
  });

  await prisma.coupon.upsert({
    where: { code: "DRAFT5" },
    create: {
      code: "DRAFT5",
      type: "PERCENT",
      percentOff: 5,
      active: true,
      startsAt: new Date("2026-01-01T00:00:00.000Z"),
      endsAt: new Date("2027-12-31T23:59:59.000Z"),
    },
    update: { percentOff: 5, active: true },
  });
}

async function main() {
  console.log("Seeding camacho_pos_comercial (DRAFT provisional data)...");
  await seedGeo();
  await seedPlans();
  await seedKits();
  await seedContent();
  console.log("Seed complete. All catalog prices remain DRAFT. WhatsApp is DEV PLACEHOLDER.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
