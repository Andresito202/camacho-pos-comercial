/**
 * Provisional DRAFT commercial catalog seed.
 * Prices are DRAFT — real charges disabled until approved.
 * WhatsApp number is a DEV PLACEHOLDER.
 * Promotion windows use America/Bogota (UTC-5) relative to "now".
 */
import { PrismaClient, PublicationStatus, FeatureCommercialStatus, BillingInterval, ProductKind, LegalDocumentType, CouponType } from "@prisma/client";

const prisma = new PrismaClient();

/** America/Bogota local wall-clock → UTC Date (fixed UTC-5, no DST). */
function bogotaLocalDate(daysFromToday: number, hour = 0, minute = 0, second = 0): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const y = Number(parts.find((p) => p.type === "year")?.value);
  const m = Number(parts.find((p) => p.type === "month")?.value);
  const d = Number(parts.find((p) => p.type === "day")?.value);
  return new Date(Date.UTC(y, m - 1, d + daysFromToday, hour + 5, minute, second));
}

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
  /** When true, omit from public plan bullet lists (still available for admin/docs via claimNote). */
  hideFromPublicBullets?: boolean;
}> = [
  {
    code: "local_first_sales",
    label: "Vende incluso cuando se interrumpe internet",
    description: "Tu punto de venta sigue atendiendo clientes aunque falle la conexión",
    status: FeatureCommercialStatus.AVAILABLE,
    claimNote: "AVAILABLE as commercial claim only where verified from POS runtime evidence; not a blanket production certification. Continuity of local sales.",
    plans: ["esencial", "profesional", "empresarial", "perpetua"],
  },
  {
    code: "sqlite_single_writer",
    label: "Tu caja sigue operando en el local",
    description: "La operación de mostrador no se detiene por un corte breve de red",
    status: FeatureCommercialStatus.AVAILABLE,
    claimNote: "Claim limited to local POS runtime architecture already implemented; commercial portal does not re-verify. Hidden from public bullets — merged into merchant continuity messaging.",
    plans: ["esencial", "profesional", "empresarial", "perpetua"],
    hideFromPublicBullets: true,
  },
  {
    code: "multi_caja",
    label: "Varias cajas en tu negocio",
    description: "Crece con más puntos de venta (1 licencia = 1 caja)",
    status: FeatureCommercialStatus.AVAILABLE,
    claimNote: "Licensing rule: one license equals one caja unless a signed contract says otherwise.",
    plans: ["profesional", "empresarial", "perpetua"],
  },
  {
    code: "inventory",
    label: "Control de inventario",
    description: "Registra entradas, salidas y existencias de tu mercancía",
    status: FeatureCommercialStatus.AVAILABLE,
    claimNote: "Status reflects POS domain capability documentation; portal sale does not prove deployment. Technical: append-only inventory movements.",
    plans: ["esencial", "profesional", "empresarial", "perpetua"],
  },
  {
    code: "central_sync",
    label: "Sincroniza información cuando recuperes la conexión",
    description: "Los datos del local se actualizan con la nube al volver internet",
    status: FeatureCommercialStatus.IN_CERTIFICATION,
    claimNote: "Persistence/sync gate exists on POS line; commercial claim stays IN_CERTIFICATION until portal E2E evidence.",
    plans: ["profesional", "empresarial", "perpetua"],
  },
  {
    code: "factus_electronic_invoice",
    label: "Emite facturas electrónicas cuando el servicio esté contratado y disponible",
    description: "Facturación electrónica según el servicio contratado y su disponibilidad",
    status: FeatureCommercialStatus.IN_CERTIFICATION,
    claimNote: "Adapter path exists in POS (FACTUS); commercial portal sales of electronic invoicing remain IN_CERTIFICATION.",
    plans: ["profesional", "empresarial", "perpetua"],
  },
  {
    code: "factus_pay",
    label: "Recaudos electrónicos (cuando esté disponible)",
    description: "Cobros electrónicos del portal cuando el servicio esté certificado",
    status: FeatureCommercialStatus.IN_CERTIFICATION,
    claimNote: "FACTUS Pay for commercial portal sales is IN_CERTIFICATION. Sandbox mock only until credentials + approval. Kept out of public plan bullets.",
    plans: ["profesional", "empresarial", "perpetua"],
    hideFromPublicBullets: true,
  },
  {
    code: "reporting",
    label: "Reportes de tu operación",
    description: "Consulta ventas e indicadores por sucursal cuando esté disponible",
    status: FeatureCommercialStatus.COMING_SOON,
    claimNote: "Not claimed as commercially available until product evidence exists.",
    plans: ["empresarial", "perpetua"],
  },
  {
    code: "multi_branch",
    label: "Varias sucursales",
    description: "Opera más de una sede con control por negocio",
    status: FeatureCommercialStatus.COMING_SOON,
    claimNote: "Commercial matrix marks COMING_SOON pending verified packaging.",
    plans: ["empresarial", "perpetua"],
  },
  {
    code: "android_companion",
    label: "App móvil companion (cuando esté disponible)",
    description: "Aplicación móvil de apoyo para el mostrador",
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
      tagline: "Para un punto de venta que necesita vender sin depender de internet",
      description:
        "Ideal para tiendas y panaderías que arrancan. Una licencia = una caja. Precio de referencia pendiente de publicación comercial.",
      sortOrder: 1,
      monthly: 29900,
      annual: 299000,
    },
    {
      slug: "profesional",
      name: "Profesional",
      tagline: "Para comercios que crecen con varias cajas y sincronización",
      description:
        "Incluye sincronización al recuperar conexión y facturación electrónica cuando el servicio esté contratado y disponible. Precio de referencia pendiente de publicación.",
      sortOrder: 2,
      monthly: 49900,
      annual: 499000,
    },
    {
      slug: "empresarial",
      name: "Empresarial",
      tagline: "Para operaciones con más cajas y expansión a sucursales",
      description:
        "Pensado para redes en crecimiento. Reportes y multi-sucursal según disponibilidad publicada. Precio de referencia pendiente de publicación.",
      sortOrder: 3,
      monthly: 89900,
      annual: 899000,
    },
    {
      slug: "perpetua",
      name: "Perpetua",
      tagline: "Licencia de pago único para una caja",
      description:
        "Oferta de licencia perpetua (pago único). Una licencia = una caja. Precio de referencia pendiente de publicación.",
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
      update: { name: `${p.name} — 1 caja` },
    });
  }

  for (const feature of FEATURE_MATRIX) {
    for (const planSlug of feature.plans) {
      const plan = await prisma.plan.findUniqueOrThrow({ where: { slug: planSlug } });
      // Public bullets omit architecture/pay features flagged hideFromPublicBullets;
      // claimNote remains technical for admin/docs. Labels stay merchant-facing.
      if (feature.hideFromPublicBullets) {
        await prisma.planFeature.upsert({
          where: { planId_code: { planId: plan.id, code: feature.code } },
          create: {
            planId: plan.id,
            code: feature.code,
            label: feature.label,
            description: feature.description,
            commercialStatus: feature.status,
            claimNote: feature.claimNote,
            sortOrder: 100,
          },
          update: {
            label: feature.label,
            description: feature.description,
            commercialStatus: feature.status,
            claimNote: feature.claimNote,
            sortOrder: 100,
          },
        });
        continue;
      }
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
    where: { planId, billingInterval: interval },
    select: { id: true },
  });
  if (existing) return;
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
      description: "Kits de equipos + licencia para arrancar tu caja",
      publicationStatus: PublicationStatus.DRAFT,
    },
    update: {
      description: "Kits de equipos + licencia para arrancar tu caja",
      publicationStatus: PublicationStatus.DRAFT,
    },
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
        description: `${k.name}: equipos de referencia + 1 licencia. Precio de referencia pendiente de publicación comercial.`,
        kind: ProductKind.KIT,
        categoryId: category.id,
        publicationStatus: PublicationStatus.DRAFT,
      },
      update: {
        name: k.name,
        description: `${k.name}: equipos de referencia + 1 licencia. Precio de referencia pendiente de publicación comercial.`,
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

  // Hardware categories + products (DRAFT). Images are SVG illustrations — not real model photos.
  const categories: Array<{ slug: string; name: string; description: string }> = [
    { slug: "impresoras-termicas", name: "Impresoras térmicas", description: "Impresión de tickets 58/80mm" },
    { slug: "cajones", name: "Cajones", description: "Cajones monederos para POS" },
    { slug: "lectores", name: "Lectores", description: "Lectores de código de barras" },
    { slug: "balanzas", name: "Balanzas", description: "Balanzas comerciales" },
    { slug: "terminales-windows", name: "Terminales Windows", description: "PCs / all-in-one para caja en Windows" },
    { slug: "terminales-android", name: "Terminales Android", description: "Tablets / terminales Android" },
    { slug: "accesorios", name: "Accesorios", description: "Cables, soportes y consumibles" },
    { slug: "kits-pos", name: "Kits POS", description: "Kits de hardware + licencia" },
  ];

  const categoryIds = new Map<string, string>();
  for (const [index, cat] of categories.entries()) {
    const row = await prisma.productCategory.upsert({
      where: { slug: cat.slug },
      create: {
        slug: cat.slug,
        name: cat.name,
        description: cat.description,
        sortOrder: index + 1,
        publicationStatus: PublicationStatus.DRAFT,
      },
      update: {
        name: cat.name,
        description: cat.description,
        publicationStatus: PublicationStatus.DRAFT,
      },
    });
    categoryIds.set(cat.slug, row.id);
  }

  // Keep legacy "hardware" slug pointing at impresoras for older links
  await prisma.productCategory.upsert({
    where: { slug: "hardware" },
    create: {
      slug: "hardware",
      name: "Hardware (legacy)",
      publicationStatus: PublicationStatus.ARCHIVED,
    },
    update: { publicationStatus: PublicationStatus.ARCHIVED },
  });

  type HwSeed = {
    slug: string;
    sku: string;
    name: string;
    category: string;
    amount: number;
    image: string;
    kind: ProductKind;
    description: string;
    stock: number;
  };

  const hardware: HwSeed[] = [
    {
      slug: "impresora-termica-80mm",
      sku: "HW-PRINT-80",
      name: "Impresora térmica 80mm",
      category: "impresoras-termicas",
      amount: 350000,
      image: "/images/hardware/impresora-termica.svg",
      kind: ProductKind.HARDWARE,
      description: "Ilustración referencial de impresora térmica 80 mm. El modelo exacto se confirma al contratar.",
      stock: 12,
    },
    {
      slug: "impresora-termica-58mm",
      sku: "HW-PRINT-58",
      name: "Impresora térmica 58mm",
      category: "impresoras-termicas",
      amount: 220000,
      image: "/images/hardware/impresora-termica.svg",
      kind: ProductKind.HARDWARE,
      description: "Ilustración referencial de impresora térmica 58 mm. El modelo exacto se confirma al contratar.",
      stock: 20,
    },
    {
      slug: "cajon-monedero-rj11",
      sku: "HW-CASH-RJ11",
      name: "Cajón monedero RJ11",
      category: "cajones",
      amount: 180000,
      image: "/images/hardware/cajon-monedero.svg",
      kind: ProductKind.HARDWARE,
      description: "Ilustración referencial de cajón monedero. Compatible con kits de caja Camacho POS.",
      stock: 15,
    },
    {
      slug: "lector-barras-usb",
      sku: "HW-SCAN-USB",
      name: "Lector de barras USB",
      category: "lectores",
      amount: 95000,
      image: "/images/hardware/lector-barras.svg",
      kind: ProductKind.HARDWARE,
      description: "Ilustración referencial de lector USB. Ideal para mostrador y recepción.",
      stock: 30,
    },
    {
      slug: "lector-barras-inalambrico",
      sku: "HW-SCAN-BT",
      name: "Lector de barras inalámbrico",
      category: "lectores",
      amount: 210000,
      image: "/images/hardware/lector-barras.svg",
      kind: ProductKind.HARDWARE,
      description: "Ilustración referencial de lector inalámbrico para movilidad en el local.",
      stock: 10,
    },
    {
      slug: "balanza-comercial",
      sku: "HW-SCALE-STD",
      name: "Balanza comercial",
      category: "balanzas",
      amount: 420000,
      image: "/images/hardware/balanza.svg",
      kind: ProductKind.HARDWARE,
      description: "Ilustración referencial de balanza comercial. Disponibilidad según sector y certificación.",
      stock: 8,
    },
    {
      slug: "terminal-windows-aio",
      sku: "HW-WIN-AIO",
      name: "Terminal Windows all-in-one",
      category: "terminales-windows",
      amount: 1890000,
      image: "/images/hardware/terminal-tactil.svg",
      kind: ProductKind.HARDWARE,
      description: "Ilustración referencial de terminal all-in-one para caja en Windows.",
      stock: 5,
    },
    {
      slug: "terminal-windows-mini-pc",
      sku: "HW-WIN-MINI",
      name: "Mini PC Windows + monitor",
      category: "terminales-windows",
      amount: 1450000,
      image: "/images/hardware/terminal-tactil.svg",
      kind: ProductKind.HARDWARE,
      description: "Ilustración referencial de mini PC Windows con monitor para mostrador.",
      stock: 7,
    },
    {
      slug: "terminal-android-tablet",
      sku: "HW-AND-TAB",
      name: "Terminal Android tablet",
      category: "terminales-android",
      amount: 980000,
      image: "/images/hardware/terminal-tactil.svg",
      kind: ProductKind.HARDWARE,
      description: "Ilustración referencial de tablet Android para operación de caja.",
      stock: 9,
    },
    {
      slug: "soporte-tablet-mostrador",
      sku: "HW-ACC-STAND",
      name: "Soporte de tablet para mostrador",
      category: "accesorios",
      amount: 75000,
      image: "/images/hardware/terminal-tactil.svg",
      kind: ProductKind.ACCESSORY,
      description: "Ilustración referencial de soporte para tablet en mostrador.",
      stock: 25,
    },
    {
      slug: "rollo-termico-80mm",
      sku: "HW-ACC-ROLL80",
      name: "Rollo térmico 80mm (caja x50)",
      category: "accesorios",
      amount: 65000,
      image: "/images/hardware/impresora-termica.svg",
      kind: ProductKind.ACCESSORY,
      description: "Consumible de referencia: rollos térmicos 80 mm (caja x50).",
      stock: 40,
    },
  ];

  for (const [index, hw] of hardware.entries()) {
    const categoryId = categoryIds.get(hw.category)!;
    const product = await prisma.product.upsert({
      where: { slug: hw.slug },
      create: {
        slug: hw.slug,
        sku: hw.sku,
        name: hw.name,
        description: hw.description,
        kind: hw.kind,
        categoryId,
        sortOrder: index + 1,
        publicationStatus: PublicationStatus.DRAFT,
        images: {
          create: {
            url: hw.image,
            alt: `${hw.name} — ilustración SVG (no foto de modelo real)`,
            sortOrder: 0,
          },
        },
        variants: {
          create: {
            sku: `${hw.sku}-STD`,
            name: "Estándar",
            amountCents: hw.amount,
            version: 1,
            publicationStatus: PublicationStatus.DRAFT,
            stock: { create: { quantityOnHand: hw.stock, trackInventory: true } },
            history: { create: { amountCents: hw.amount, reason: "initial-seed", changedBy: "seed" } },
          },
        },
      },
      update: {
        name: hw.name,
        description: hw.description,
        categoryId,
        publicationStatus: PublicationStatus.DRAFT,
        sortOrder: index + 1,
      },
    });

    const variantSku = `${hw.sku}-STD`;
    const variant = await prisma.productVariant.upsert({
      where: { sku: variantSku },
      create: {
        productId: product.id,
        sku: variantSku,
        name: "Estándar",
        amountCents: hw.amount,
        version: 1,
        publicationStatus: PublicationStatus.DRAFT,
        stock: { create: { quantityOnHand: hw.stock, trackInventory: true } },
        history: { create: { amountCents: hw.amount, reason: "initial-seed", changedBy: "seed" } },
      },
      update: {
        amountCents: hw.amount,
        publicationStatus: PublicationStatus.DRAFT,
        productId: product.id,
      },
    });

    await prisma.productStock.upsert({
      where: { productVariantId: variant.id },
      create: {
        productVariantId: variant.id,
        quantityOnHand: hw.stock,
        trackInventory: true,
      },
      update: { quantityOnHand: hw.stock },
    });

    const existingImage = await prisma.productImage.findFirst({
      where: { productId: product.id, url: hw.image },
    });
    if (!existingImage) {
      await prisma.productImage.create({
        data: {
          productId: product.id,
          url: hw.image,
          alt: `${hw.name} — ilustración SVG (no foto de modelo real)`,
          sortOrder: 0,
        },
      });
    }
  }

  // Attach SVG illustrations to kits
  for (const k of kits) {
    const product = await prisma.product.findUnique({ where: { slug: k.slug } });
    if (!product) continue;
    const img = await prisma.productImage.findFirst({
      where: { productId: product.id, url: "/images/hardware/terminal-tactil.svg" },
    });
    if (!img) {
      await prisma.productImage.create({
        data: {
          productId: product.id,
          url: "/images/hardware/terminal-tactil.svg",
          alt: `${k.name} — ilustración SVG (no foto de modelo real)`,
          sortOrder: 0,
        },
      });
    }
  }
}

async function seedPromotions() {
  // Relative to America/Bogota "today" so some are active in staging right now.
  const promos: Array<{
    code: string;
    name: string;
    description: string;
    startDays: number;
    endDays: number;
    status: PublicationStatus;
    coupon?: {
      code: string;
      type: CouponType;
      percentOff?: number;
      amountOffCents?: number;
    };
  }> = [
    {
      code: "BLACK-FRIDAY",
      name: "Black Friday",
      description: "Descuentos especiales de temporada en planes y kits seleccionados.",
      startDays: -3,
      endDays: 4,
      status: PublicationStatus.DRAFT,
      coupon: { code: "BF15", type: CouponType.PERCENT, percentOff: 15 },
    },
    {
      code: "CYBER-MONDAY",
      name: "Cyber Monday",
      description: "Promoción de inicio de semana en software y equipos.",
      startDays: -1,
      endDays: 2,
      status: PublicationStatus.DRAFT,
      coupon: { code: "CYBER10", type: CouponType.PERCENT, percentOff: 10 },
    },
    {
      code: "LANZAMIENTO",
      name: "Lanzamiento portal",
      description: "Beneficio de lanzamiento al contratar tu primer plan Camacho POS.",
      startDays: -14,
      endDays: 45,
      status: PublicationStatus.DRAFT,
      coupon: { code: "LANZA5", type: CouponType.PERCENT, percentOff: 5 },
    },
    {
      code: "ANUAL",
      name: "Descuento plan anual",
      description: "Ahorra al contratar el plan con pago anual.",
      startDays: -7,
      endDays: 60,
      status: PublicationStatus.DRAFT,
      coupon: { code: "ANUAL8", type: CouponType.PERCENT, percentOff: 8 },
    },
    {
      code: "KIT-DISCOUNT",
      name: "Descuento en kits",
      description: "Descuento especial sobre kits de equipos seleccionados.",
      startDays: -2,
      endDays: 30,
      status: PublicationStatus.DRAFT,
      coupon: { code: "KIT50K", type: CouponType.FIXED_AMOUNT, amountOffCents: 50000 },
    },
    {
      code: "FUTURE-SAMPLE",
      name: "Campaña programada",
      description: "Próxima campaña comercial — aún no vigente.",
      startDays: 30,
      endDays: 60,
      status: PublicationStatus.DRAFT,
      coupon: { code: "FUTURE20", type: CouponType.PERCENT, percentOff: 20 },
    },
  ];

  for (const promo of promos) {
    const startsAt = bogotaLocalDate(promo.startDays, 0, 0, 0);
    const endsAt = bogotaLocalDate(promo.endDays, 23, 59, 59);
    const row = await prisma.promotion.upsert({
      where: { code: promo.code },
      create: {
        code: promo.code,
        name: promo.name,
        description: promo.description,
        publicationStatus: promo.status,
        startsAt,
        endsAt,
      },
      update: {
        name: promo.name,
        description: promo.description,
        publicationStatus: promo.status,
        startsAt,
        endsAt,
        deletedAt: null,
      },
    });

    if (promo.coupon) {
      await prisma.coupon.upsert({
        where: { code: promo.coupon.code },
        create: {
          code: promo.coupon.code,
          type: promo.coupon.type,
          percentOff: promo.coupon.percentOff ?? null,
          amountOffCents: promo.coupon.amountOffCents ?? null,
          active: true,
          startsAt,
          endsAt,
          promotionId: row.id,
        },
        update: {
          type: promo.coupon.type,
          percentOff: promo.coupon.percentOff ?? null,
          amountOffCents: promo.coupon.amountOffCents ?? null,
          active: true,
          startsAt,
          endsAt,
          promotionId: row.id,
          deletedAt: null,
        },
      });
    }
  }
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
      promoBannerMessage: "Kit de apertura con instalación remota incluida este mes.",
      promoBannerHref: "/promociones",
      promoBannerCta: "Ver promoción",
      publicationStatus: PublicationStatus.DRAFT,
    },
    update: {
      brandName: "Camacho POS Colombia",
      domain: "camachoposcolombia.com",
      primaryColor: "#0B3D2E",
      secondaryColor: "#F5C518",
      accentColor: "#1A5C45",
      whatsappNumber: "573000000000_DEV_PLACEHOLDER",
      promoBannerMessage: "Kit de apertura con instalación remota incluida este mes.",
      promoBannerHref: "/promociones",
      promoBannerCta: "Ver promoción",
      publicationStatus: PublicationStatus.DRAFT,
    },
  });

  const socials = [
    { platform: "facebook", url: "https://www.facebook.com/camachoposcolombia", sortOrder: 1 },
    { platform: "instagram", url: "https://www.instagram.com/camachoposcolombia", sortOrder: 2 },
    { platform: "youtube", url: "https://www.youtube.com/@camachoposcolombia", sortOrder: 3 },
    { platform: "linkedin", url: "https://www.linkedin.com/company/camacho-pos-colombia", sortOrder: 4 },
  ];
  for (const social of socials) {
    await prisma.socialLink.upsert({
      where: { platform_url: { platform: social.platform, url: social.url } },
      create: {
        ...social,
        publicationStatus: PublicationStatus.PUBLISHED,
      },
      update: { publicationStatus: PublicationStatus.PUBLISHED, sortOrder: social.sortOrder },
    });
  }

  await prisma.faq.upsert({
    where: { slug: "que-incluye-una-licencia" },
    create: {
      slug: "que-incluye-una-licencia",
      question: "¿Qué incluye una licencia?",
      answer:
        "Una licencia corresponde a una caja (punto de venta), salvo que un contrato firmado indique otra cosa. Los precios de referencia pendientes de publicación no autorizan cobro real.",
      category: "licencias",
      publicationStatus: PublicationStatus.DRAFT,
    },
    update: {
      answer:
        "Una licencia corresponde a una caja (punto de venta), salvo que un contrato firmado indique otra cosa. Los precios de referencia pendientes de publicación no autorizan cobro real.",
      publicationStatus: PublicationStatus.DRAFT,
    },
  });

  await prisma.blogPost.upsert({
    where: { slug: "bienvenida-camacho-pos" },
    create: {
      slug: "bienvenida-camacho-pos",
      title: "Camacho POS Colombia — bienvenida al portal comercial",
      excerpt: "Contenido de referencia del portal comercial.",
      body: "Este artículo presenta el portal comercial de Camacho POS Colombia. No constituye oferta vinculante hasta publicación aprobada.",
      publicationStatus: PublicationStatus.DRAFT,
    },
    update: {
      title: "Camacho POS Colombia — bienvenida al portal comercial",
      excerpt: "Contenido de referencia del portal comercial.",
      body: "Este artículo presenta el portal comercial de Camacho POS Colombia. No constituye oferta vinculante hasta publicación aprobada.",
      publicationStatus: PublicationStatus.DRAFT,
    },
  });

  const legal = [
    {
      type: LegalDocumentType.TERMS,
      slug: "terminos-condiciones",
      title: "Términos y condiciones (pendiente de publicación)",
      body: "DOCUMENTO LEGAL PENDIENTE DE PUBLICACIÓN. No constituye términos vinculantes hasta aprobación.",
      version: "0.1.0-draft",
    },
    {
      type: LegalDocumentType.PRIVACY,
      slug: "politica-privacidad",
      title: "Política de privacidad (pendiente de publicación)",
      body: "DOCUMENTO LEGAL PENDIENTE DE PUBLICACIÓN. Tratamiento de datos pendiente de aprobación jurídica.",
      version: "0.1.0-draft",
    },
    {
      type: LegalDocumentType.COOKIES,
      slug: "politica-cookies",
      title: "Política de cookies (pendiente de publicación)",
      body: "DOCUMENTO LEGAL PENDIENTE DE PUBLICACIÓN.",
      version: "0.1.0-draft",
    },
    {
      type: LegalDocumentType.LICENSE,
      slug: "contrato-licencia",
      title: "Contrato de licencia de software (pendiente de publicación)",
      body: "DOCUMENTO LEGAL PENDIENTE DE PUBLICACIÓN. Una licencia = una caja salvo pacto en contrario.",
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
      description:
        "Software POS y kits para el comercio colombiano. Vende aunque se interrumpa internet. Precios de referencia pendientes de publicación.",
      canonicalUrl: "https://camachoposcolombia.com/",
      robots: "noindex,nofollow",
    },
    update: {
      title: "Camacho POS Colombia",
      description:
        "Software POS y kits para el comercio colombiano. Vende aunque se interrumpa internet. Precios de referencia pendientes de publicación.",
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
  await seedPromotions();
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
