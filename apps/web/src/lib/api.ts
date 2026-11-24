import {
  draftBlog,
  draftCoverage,
  draftEquipment,
  draftFaq,
  draftFeatures,
  draftPlans,
  draftPromotions,
  draftSettings,
  draftSolutions,
} from "./draft-data";
import { allowDraftFallback, getApiUrl, isDevelopment } from "./env";
import type {
  AdminSession,
  ApiSource,
  BlogPost,
  Cart,
  CartItem,
  CheckoutStatus,
  CoverageCity,
  Equipment,
  FaqItem,
  FeatureFlag,
  FeatureStatus,
  Plan,
  Promotion,
  SiteSettings,
  SolutionSector,
} from "./types";

export type FetchResult<T> = {
  data: T;
  source: ApiSource;
};

type ApiPlan = {
  id: string;
  slug: string;
  name: string;
  tagline?: string | null;
  description: string;
  publicationStatus: string;
  features?: Array<{ label: string; commercialStatus?: string }>;
  prices?: Array<{
    id: string;
    billingInterval: string;
    amountCents: number;
    currencyCode: string;
    publicationStatus: string;
    version: number;
  }>;
};

type ApiProduct = {
  id: string;
  slug: string;
  sku?: string;
  name: string;
  description: string;
  kind?: string;
  publicationStatus: string;
  variants?: Array<{
    id: string;
    name: string;
    amountCents: number;
    publicationStatus: string;
    version: number;
  }>;
};

type ApiKit = {
  id: string;
  slug: string;
  name: string;
  description: string;
  amountCents: number;
  currencyCode?: string;
  publicationStatus: string;
  priceVersion: number;
};

type ApiFaq = {
  id: string;
  question: string;
  answer: string;
  category?: string | null;
  slug?: string;
};

type ApiBlog = {
  id?: string;
  slug: string;
  title: string;
  excerpt?: string | null;
  body: string;
  publishedAt?: string | null;
};

type ApiSettings = {
  brandName?: string;
  whatsappNumber?: string;
  supportEmail?: string;
  publicationStatus?: string;
  whatsappIsDevPlaceholder?: boolean;
};

type ApiZone = {
  id: string;
  code: string;
  name: string;
  publicationStatus?: string;
  city?: { name: string; departmentId?: string } | null;
  rates?: Array<{ minDays?: number | null; maxDays?: number | null }>;
};

type ApiCart = {
  id: string;
  sessionToken: string;
  status: string;
  items: unknown[];
  totals: {
    currencyCode: string;
    subtotalCents: number;
    discountCents: number;
    shippingCents: number;
    taxCents: number;
    totalCents: number;
  };
};

type ApiCheckout = {
  id: string;
  orderNumber?: string;
  status: string;
  totalCents?: number;
  paymentReference?: string | null;
};

type ApiInit = RequestInit & { next?: { revalidate?: number | false }; cache?: RequestCache };

async function apiFetch<T>(path: string, init?: ApiInit): Promise<T | null> {
  const url = `${getApiUrl()}${path}`;
  try {
    const { cache, next, headers, ...rest } = init ?? {};
    const response = await fetch(url, {
      ...rest,
      cache,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(headers ?? {}),
      },
      next: cache === "no-store" ? undefined : (next ?? { revalidate: 60 }),
    } as RequestInit);
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

async function apiFetchRaw(
  path: string,
  init?: ApiInit,
): Promise<{ ok: boolean; status: number; body: unknown }> {
  const url = `${getApiUrl()}${path}`;
  try {
    const { cache, next, headers, ...rest } = init ?? {};
    const response = await fetch(url, {
      ...rest,
      cache,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(headers ?? {}),
      },
      next: cache === "no-store" ? undefined : next,
    } as RequestInit);
    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }
    return { ok: response.ok, status: response.status, body };
  } catch {
    return { ok: false, status: 0, body: null };
  }
}

function draftOrThrow<T>(data: T): FetchResult<T> {
  if (!allowDraftFallback()) {
    throw new Error("commercial-api no disponible y no hay preview DRAFT en producción");
  }
  return { data, source: "draft" };
}

function mapFeatureStatus(value?: string | null): FeatureStatus {
  switch ((value ?? "").toUpperCase()) {
    case "AVAILABLE":
    case "PUBLISHED":
    case "DISPONIBLE":
      return "disponible";
    case "IN_CERTIFICATION":
    case "EN_CERTIFICACION":
      return "en_certificacion";
    case "COMING_SOON":
    case "PROXIMAMENTE":
      return "proximamente";
    case "DRAFT":
    case "BORRADOR":
      // Provisional catalog visible in development; purchase remains gated server-side.
      return "borrador";
    case "ARCHIVED":
    case "UNPUBLISHED":
    case "NO_PUBLICADA":
      return "no_publicada";
    default:
      return "no_publicada";
  }
}

function pickPrice(
  prices: NonNullable<ApiPlan["prices"]> | undefined,
  interval: string,
): NonNullable<ApiPlan["prices"]>[number] | undefined {
  if (!prices?.length) return undefined;
  const publishedInterval = prices.find(
    (p) => p.billingInterval === interval && p.publicationStatus === "PUBLISHED",
  );
  if (publishedInterval) return publishedInterval;
  if (interval === "MONTHLY") {
    const anyPublished = prices.find((p) => p.publicationStatus === "PUBLISHED");
    if (anyPublished) return anyPublished;
  }
  const draftInterval = prices.find((p) => p.billingInterval === interval);
  if (draftInterval) return draftInterval;
  return prices[0];
}

function mapPlan(plan: ApiPlan): Plan {
  const monthly = pickPrice(plan.prices, "MONTHLY");
  const yearly = pickPrice(plan.prices, "ANNUAL");
  const perpetual = pickPrice(plan.prices, "PERPETUAL");
  const primary = monthly ?? yearly ?? perpetual;
  const primaryInterval = (primary?.billingInterval ?? "MONTHLY") as Plan["primaryInterval"];
  return {
    id: plan.id,
    slug: plan.slug,
    name: plan.name,
    tagline: plan.tagline ?? plan.description.slice(0, 120),
    description: plan.description,
    priceMonthly: {
      amountCents: primary?.amountCents ?? 0,
      currency: "COP",
    },
    primaryInterval,
    ...(primary
      ? { planPriceId: primary.id, priceVersion: primary.version }
      : {}),
    highlights: (plan.features ?? []).map((f) => f.label).slice(0, 6),
    status: mapFeatureStatus(plan.publicationStatus),
    featured: plan.publicationStatus === "PUBLISHED" || plan.publicationStatus === "DRAFT",
    ...(yearly ? { priceYearly: { amountCents: yearly.amountCents, currency: "COP" as const } } : {}),
  };
}

function mapProduct(product: ApiProduct): Equipment {
  const variant =
    product.variants?.find((v) => v.publicationStatus === "PUBLISHED") ?? product.variants?.[0];
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    category: product.kind ?? "Equipo",
    summary: product.description.slice(0, 160),
    description: product.description,
    price: { amountCents: variant?.amountCents ?? 0, currency: "COP" },
    image: `/images/hardware/${guessHardwareImage(product.slug)}`,
    status: mapFeatureStatus(product.publicationStatus),
    featured: product.publicationStatus === "PUBLISHED" || product.publicationStatus === "DRAFT",
    specs: (product.variants ?? []).map((v) => v.name),
    ...(variant
      ? { productVariantId: variant.id, priceVersion: variant.version }
      : {}),
  };
}

function mapKit(kit: ApiKit): Equipment {
  return {
    id: kit.id,
    slug: kit.slug,
    name: kit.name,
    category: "Kit",
    summary: kit.description.slice(0, 160),
    description: kit.description,
    price: { amountCents: kit.amountCents, currency: "COP" },
    image: "/images/hardware/terminal-tactil.svg",
    status: mapFeatureStatus(kit.publicationStatus),
    featured: kit.publicationStatus === "PUBLISHED" || kit.publicationStatus === "DRAFT",
    specs: ["Kit comercial", `slug:${kit.slug}`],
    kitId: kit.id,
    priceVersion: kit.priceVersion,
  };
}

function guessHardwareImage(slug: string): string {
  if (slug.includes("impresora")) return "impresora-termica.svg";
  if (slug.includes("lector") || slug.includes("barra")) return "lector-barras.svg";
  if (slug.includes("balanza")) return "balanza.svg";
  if (slug.includes("cajon") || slug.includes("monedero")) return "cajon-monedero.svg";
  return "terminal-tactil.svg";
}

function mapZone(zone: ApiZone): CoverageCity {
  const lead = zone.rates?.[0]?.minDays ?? zone.rates?.[0]?.maxDays ?? 5;
  return {
    slug: zone.code.toLowerCase().replace(/[^a-z0-9-]+/g, "-"),
    name: zone.city?.name ?? zone.name,
    department: zone.city?.departmentId ?? "Colombia",
    summary: `Zona de cobertura ${zone.name}.`,
    leadTimeDays: lead,
    status: mapFeatureStatus(zone.publicationStatus ?? "PUBLISHED"),
  };
}

function mapPaymentStatus(status?: string): CheckoutStatus {
  switch ((status ?? "").toUpperCase()) {
    case "PAID":
    case "PAGADO":
      return "pagado";
    case "FAILED":
    case "REJECTED":
    case "RECHAZADO":
      return "rechazado";
    case "EXPIRED":
    case "EXPIRADO":
      return "expirado";
    default:
      return "pendiente";
  }
}

export async function getSettings(): Promise<FetchResult<SiteSettings>> {
  const data = await apiFetch<ApiSettings>("/v1/content/settings");
  if (data) {
    return {
      source: "api",
      data: {
        ...(draftSettings.promoBar ? { promoBar: draftSettings.promoBar } : { promoBar: null }),
        ...(data.whatsappNumber
          ? { whatsappNumber: data.whatsappNumber.replace(/_DEV_PLACEHOLDER$/, "") }
          : {}),
        ...(data.supportEmail ? { supportEmail: data.supportEmail } : {}),
        maintenanceMode: false,
      },
    };
  }
  return draftOrThrow(draftSettings);
}

export async function getPlans(): Promise<FetchResult<Plan[]>> {
  const data = await apiFetch<ApiPlan[]>("/v1/catalog/plans");
  if (data?.length) return { data: data.map(mapPlan), source: "api" };
  return draftOrThrow(draftPlans);
}

export async function getPlan(slug: string): Promise<FetchResult<Plan | null>> {
  const plans = await getPlans();
  return { data: plans.data.find((plan) => plan.slug === slug) ?? null, source: plans.source };
}

export async function getEquipmentList(): Promise<FetchResult<Equipment[]>> {
  const [products, kits] = await Promise.all([
    apiFetch<ApiProduct[]>("/v1/catalog/products"),
    apiFetch<ApiKit[]>("/v1/catalog/kits"),
  ]);
  if (products || kits) {
    const mapped = [
      ...(products ?? []).map(mapProduct),
      ...(kits ?? []).map(mapKit),
    ];
    if (mapped.length) return { data: mapped, source: "api" };
  }
  return draftOrThrow(draftEquipment);
}

export async function getEquipment(slug: string): Promise<FetchResult<Equipment | null>> {
  const list = await getEquipmentList();
  return { data: list.data.find((item) => item.slug === slug) ?? null, source: list.source };
}

export async function getPromotions(): Promise<FetchResult<Promotion[]>> {
  // commercial-api exposes coupon validation, not a public promo list yet.
  if (!isDevelopment()) {
    return { data: [], source: "api" };
  }
  return draftOrThrow(draftPromotions);
}

export async function getCoverage(): Promise<FetchResult<CoverageCity[]>> {
  const zones = await apiFetch<ApiZone[]>("/v1/coverage/zones");
  if (zones?.length) return { data: zones.map(mapZone), source: "api" };
  return draftOrThrow(draftCoverage);
}

export async function getCoverageCity(slug: string): Promise<FetchResult<CoverageCity | null>> {
  const list = await getCoverage();
  return { data: list.data.find((city) => city.slug === slug) ?? null, source: list.source };
}

export async function getSolutions(): Promise<FetchResult<SolutionSector[]>> {
  // Sector pages are editorial content in the web app until content API owns them.
  return { data: draftSolutions, source: isDevelopment() ? "draft" : "api" };
}

export async function getSolution(slug: string): Promise<FetchResult<SolutionSector | null>> {
  const list = await getSolutions();
  return { data: list.data.find((item) => item.slug === slug) ?? null, source: list.source };
}

export async function getFaq(): Promise<FetchResult<FaqItem[]>> {
  const data = await apiFetch<ApiFaq[]>("/v1/content/faqs");
  if (data?.length) {
    return {
      source: "api",
      data: data.map((item) => ({
        id: item.id,
        question: item.question,
        answer: item.answer,
        category: item.category ?? "General",
      })),
    };
  }
  return draftOrThrow(draftFaq);
}

export async function getFeatures(): Promise<FetchResult<FeatureFlag[]>> {
  const plans = await apiFetch<ApiPlan[]>("/v1/catalog/plans");
  if (plans?.length) {
    const features = plans.flatMap((plan) =>
      (plan.features ?? []).map((feature, index) => ({
        id: `${plan.slug}-${feature.label}-${index}`,
        name: feature.label,
        description: `${plan.name}: ${feature.label}`,
        status: mapFeatureStatus(feature.commercialStatus),
      })),
    );
    if (features.length) return { data: features, source: "api" };
  }
  return draftOrThrow(draftFeatures);
}

export async function getBlogPosts(): Promise<FetchResult<BlogPost[]>> {
  const data = await apiFetch<ApiBlog[]>("/v1/content/blog");
  if (data?.length) {
    return {
      source: "api",
      data: data.map((post) => ({
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt ?? post.body.slice(0, 160),
        publishedAt: (post.publishedAt ?? "").slice(0, 10) || "2026-01-01",
        readingMinutes: Math.max(3, Math.round(post.body.split(/\s+/).length / 180)),
        tags: ["Camacho POS"],
        body: post.body.split(/\n+/).filter(Boolean),
      })),
    };
  }
  return draftOrThrow(draftBlog);
}

export async function getBlogPost(slug: string): Promise<FetchResult<BlogPost | null>> {
  const posts = await getBlogPosts();
  return { data: posts.data.find((post) => post.slug === slug) ?? null, source: posts.source };
}

export async function buildWhatsAppMessage(input: {
  intent: string;
  planId?: string;
  planSlug?: string;
  equipmentIds?: string[];
  city?: string;
  note?: string;
}): Promise<{ url: string; message: string; source: ApiSource }> {
  const data = await apiFetch<{ url: string; text: string }>("/v1/whatsapp/catalog-message", {
    method: "POST",
    body: JSON.stringify({
      planSlug: input.planSlug,
      utmSource: input.intent.slice(0, 40),
    }),
    cache: "no-store",
  });
  if (data?.url) return { url: data.url, message: data.text, source: "api" };

  const settings = draftSettings;
  const lines = [
    "Hola, quiero información de Camacho POS Colombia.",
    `Intención: ${input.intent}`,
    input.planSlug || input.planId ? `Plan: ${input.planSlug ?? input.planId}` : null,
    input.equipmentIds?.length ? `Equipos: ${input.equipmentIds.join(", ")}` : null,
    input.city ? `Ciudad: ${input.city}` : null,
    input.note ? `Nota: ${input.note}` : null,
  ].filter(Boolean);
  const message = lines.join("\n");
  const number = settings.whatsappNumber ?? "573001112233";
  const url = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
  if (!isDevelopment()) throw new Error("No se pudo construir el mensaje de WhatsApp");
  return { url, message, source: "draft" };
}

export async function submitDemoRequest(payload: Record<string, string>): Promise<{ ok: boolean; id?: string }> {
  const body = {
    fullName: payload.name ?? payload.fullName,
    email: payload.email,
    phoneE164: payload.phone ?? payload.phoneE164,
    sector: payload.sector,
    notes: [payload.business, payload.city, payload.goals, payload.notes].filter(Boolean).join(" | "),
  };
  const data = await apiFetch<{ id?: string }>("/v1/crm/demo", {
    method: "POST",
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (data) return { ok: true, ...(data.id ? { id: data.id } : {}) };
  if (isDevelopment()) return { ok: true, id: `draft-demo-${Date.now()}` };
  return { ok: false };
}

export async function submitContact(payload: Record<string, string>): Promise<{ ok: boolean; id?: string }> {
  const body = {
    fullName: payload.name ?? payload.fullName,
    email: payload.email,
    phoneE164: payload.phone ?? payload.phoneE164,
    companyName: payload.companyName,
    message: payload.message ?? payload.subject,
    sourcePath: "/contacto",
  };
  const data = await apiFetch<{ id?: string }>("/v1/crm/contact", {
    method: "POST",
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (data) return { ok: true, ...(data.id ? { id: data.id } : {}) };
  if (isDevelopment()) return { ok: true, id: `draft-contact-${Date.now()}` };
  return { ok: false };
}

export async function quoteCart(items: CartItem[]): Promise<FetchResult<Cart>> {
  const subtotalCents = items.reduce((sum, item) => sum + item.unitPrice.amountCents * item.quantity, 0);
  // Prefer local quote; API cart is session-token based and wired in checkout flow.
  return {
    source: "draft",
    data: {
      items,
      subtotal: { amountCents: subtotalCents, currency: "COP" },
      currency: "COP",
    },
  };
}

function cartItemToApiPayload(item: CartItem): Record<string, unknown> | null {
  const quantity = item.quantity;
  const expectedPriceVersion = item.priceVersion;
  if (!expectedPriceVersion) return null;

  if (item.planPriceId) {
    return {
      planPriceId: item.planPriceId,
      quantity,
      expectedPriceVersion,
      expectedUnitAmountCents: item.unitPrice.amountCents,
    };
  }
  if (item.kitId) {
    return {
      kitId: item.kitId,
      quantity,
      expectedPriceVersion,
      expectedUnitAmountCents: item.unitPrice.amountCents,
    };
  }
  if (item.productVariantId) {
    return {
      productVariantId: item.productVariantId,
      quantity,
      expectedPriceVersion,
      expectedUnitAmountCents: item.unitPrice.amountCents,
    };
  }
  return null;
}

export async function createCheckout(input: {
  items: CartItem[];
  customer: Record<string, string>;
}): Promise<{ id: string; status: CheckoutStatus; source: ApiSource } | null> {
  const cartRes = await apiFetchRaw("/v1/cart", { method: "POST", cache: "no-store" });
  const cart = cartRes.body as ApiCart | null;
  if (!cartRes.ok || !cart?.sessionToken) {
    if (!isDevelopment()) return null;
    return { id: `draft-chk-${Date.now()}`, status: "pendiente", source: "draft" };
  }

  for (const item of input.items) {
    const payload = cartItemToApiPayload(item);
    if (!payload) {
      if (!isDevelopment()) return null;
      return { id: `draft-chk-${Date.now()}`, status: "pendiente", source: "draft" };
    }
    const addRes = await apiFetchRaw(`/v1/cart/${cart.sessionToken}/items`, {
      method: "POST",
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    if (!addRes.ok) {
      if (!isDevelopment()) return null;
      return { id: `draft-chk-${Date.now()}`, status: "pendiente", source: "draft" };
    }
  }

  const idempotencyKey = `web-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const checkoutRes = await apiFetchRaw("/v1/checkout", {
    method: "POST",
    body: JSON.stringify({
      cartSessionToken: cart.sessionToken,
      idempotencyKey,
      customer: {
        fullName: input.customer.businessName || input.customer.fullName || "Cliente",
        email: input.customer.email,
        phoneE164: input.customer.phone || input.customer.phoneE164,
      },
      business: {
        legalName: input.customer.businessName || input.customer.fullName || "Cliente",
        nit: input.customer.nit,
        cityCode: input.customer.city?.slice(0, 10) || undefined,
        addressLine: input.customer.notes || undefined,
      },
    }),
    cache: "no-store",
  });

  const data = checkoutRes.body as ApiCheckout | null;
  if (checkoutRes.ok && data?.paymentReference) {
    return {
      id: data.paymentReference,
      status: mapPaymentStatus(data.status),
      source: "api",
    };
  }
  if (checkoutRes.ok && data?.id) {
    return {
      id: data.id,
      status: mapPaymentStatus(data.status),
      source: "api",
    };
  }
  if (!isDevelopment()) return null;
  return { id: `draft-chk-${Date.now()}`, status: "pendiente", source: "draft" };
}

export async function getCheckoutStatus(
  id: string,
): Promise<FetchResult<{ id: string; status: CheckoutStatus }> | null> {
  // commercial-api lookup key is payment referenceCode
  const data = await apiFetch<{
    referenceCode?: string;
    id?: string;
    status: string;
  }>(`/v1/payments/${encodeURIComponent(id)}`, {
    cache: "no-store",
  });
  if (data) {
    return {
      source: "api",
      data: {
        id: data.referenceCode ?? data.id ?? id,
        status: mapPaymentStatus(data.status),
      },
    };
  }
  if (isDevelopment() && id.startsWith("draft-")) {
    return { data: { id, status: "pendiente" }, source: "draft" };
  }
  return null;
}

export async function getAdminSession(token?: string): Promise<AdminSession> {
  if (!token) return { authenticated: false, role: "NONE" };
  // Probe a GLOBAL-guarded endpoint; no dedicated /session route yet.
  const url = `${getApiUrl()}/v1/admin/catalog/plans`;
  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      cache: "no-store",
    });
    if (response.ok) {
      return { authenticated: true, role: "GLOBAL", displayName: "Superadministrador" };
    }
  } catch {
    /* fail closed */
  }
  return { authenticated: false, role: "NONE" };
}

export async function adminFetch<T>(path: string, token?: string): Promise<T | null> {
  if (!token) return null;
  return apiFetch<T>(path, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
}
