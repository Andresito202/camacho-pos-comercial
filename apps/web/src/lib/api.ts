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
import { allowAdminTestFixture, allowDraftFallback, getApiUrl, isDevelopment } from "./env";
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

/** Architecture / payment codes kept out of public plan bullets. */
const HIDDEN_PUBLIC_FEATURE_CODES = new Set(["sqlite_single_writer", "factus_pay"]);

type ApiPlan = {
  id: string;
  slug: string;
  name: string;
  tagline?: string | null;
  description: string;
  publicationStatus: string;
  licensesPerUnit?: number;
  features?: Array<{
    code?: string;
    label: string;
    description?: string | null;
    commercialStatus?: string;
    sortOrder?: number;
  }>;
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
  category?: { slug?: string; name?: string } | null;
  images?: Array<{ url: string; alt?: string | null }>;
  variants?: Array<{
    id: string;
    name: string;
    amountCents: number;
    publicationStatus: string;
    version: number;
  }>;
};

type ApiPromotion = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  publicationStatus: string;
  startsAt?: string | null;
  endsAt?: string | null;
  validUntil?: string | null;
  active?: boolean;
  ctaHref?: string;
  ctaLabel?: string;
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
  promoBannerMessage?: string | null;
  promoBannerHref?: string | null;
  promoBannerCta?: string | null;
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
  // Never fall back to another billing interval — missing interval means undefined.
  return prices.find((p) => p.billingInterval === interval);
}

function mapPlan(plan: ApiPlan): Plan {
  const monthly = pickPrice(plan.prices, "MONTHLY");
  const yearly = pickPrice(plan.prices, "ANNUAL");
  const perpetual = pickPrice(plan.prices, "PERPETUAL");
  const primary = monthly ?? yearly ?? perpetual;
  const primaryInterval = (primary?.billingInterval ?? "MONTHLY") as Plan["primaryInterval"];
  const publicFeatures = (plan.features ?? []).filter(
    (f) => !f.code || !HIDDEN_PUBLIC_FEATURE_CODES.has(f.code),
  );
  const features = publicFeatures.map((f) => ({
    code: f.code ?? f.label,
    label: f.label,
    ...(f.description ? { description: f.description } : {}),
    commercialStatus: mapFeatureStatus(f.commercialStatus),
  }));
  const prices: NonNullable<Plan["prices"]> = {};
  if (monthly) {
    prices.MONTHLY = {
      planPriceId: monthly.id,
      amountCents: monthly.amountCents,
      currency: "COP",
      version: monthly.version,
      publicationStatus: monthly.publicationStatus,
    };
  }
  if (yearly) {
    prices.ANNUAL = {
      planPriceId: yearly.id,
      amountCents: yearly.amountCents,
      currency: "COP",
      version: yearly.version,
      publicationStatus: yearly.publicationStatus,
    };
  }
  if (perpetual) {
    prices.PERPETUAL = {
      planPriceId: perpetual.id,
      amountCents: perpetual.amountCents,
      currency: "COP",
      version: perpetual.version,
      publicationStatus: perpetual.publicationStatus,
    };
  }
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
    prices,
    highlights: features.map((f) => f.label).slice(0, 6),
    features,
    status: mapFeatureStatus(plan.publicationStatus),
    featured: plan.publicationStatus === "PUBLISHED" || plan.publicationStatus === "DRAFT",
    supportNote: "Soporte comercial según el plan contratado",
    licensesPerUnit: plan.licensesPerUnit ?? 1,
    ...(yearly ? { priceYearly: { amountCents: yearly.amountCents, currency: "COP" as const } } : {}),
    ...(perpetual
      ? { pricePerpetual: { amountCents: perpetual.amountCents, currency: "COP" as const } }
      : {}),
  };
}

/** Strip internal staging jargon from merchant-facing catalog copy. */
function scrubMerchantCopy(text: string): string {
  return text
    .replace(/\bPrecio DRAFT\b[^.]*\.?/gi, "")
    .replace(/\bprecios DRAFT\b[^.]*\.?/gi, "")
    .replace(/\bprecio provisional DRAFT\b[^.]*\.?/gi, "")
    .replace(/\bDRAFT\b/g, "")
    .replace(/\bElectron POS\b/gi, "caja en Windows")
    .replace(/\bElectron\b/g, "Windows")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+\./g, ".")
    .trim();
}

function mapProduct(product: ApiProduct): Equipment {
  const variant =
    product.variants?.find((v) => v.publicationStatus === "PUBLISHED") ?? product.variants?.[0];
  const imageFromApi = product.images?.[0]?.url;
  const description = scrubMerchantCopy(product.description);
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    category: product.category?.name ?? product.category?.slug ?? product.kind ?? "Equipo",
    summary: description.slice(0, 160),
    description,
    price: { amountCents: variant?.amountCents ?? 0, currency: "COP" },
    image: imageFromApi || `/images/hardware/${guessHardwareImage(product.slug, product.category?.slug)}`,
    status: mapFeatureStatus(product.publicationStatus),
    featured: product.publicationStatus === "PUBLISHED" || product.publicationStatus === "DRAFT",
    specs: (product.variants ?? []).map((v) => v.name),
    ...(variant
      ? { productVariantId: variant.id, priceVersion: variant.version }
      : {}),
  };
}

function mapKit(kit: ApiKit): Equipment {
  const description = scrubMerchantCopy(kit.description);
  return {
    id: kit.id,
    slug: kit.slug,
    name: kit.name,
    category: "Kit",
    summary: description.slice(0, 160),
    description,
    price: { amountCents: kit.amountCents, currency: "COP" },
    image: "/images/hardware/terminal-tactil.svg",
    status: mapFeatureStatus(kit.publicationStatus),
    featured: kit.publicationStatus === "PUBLISHED" || kit.publicationStatus === "DRAFT",
    specs: ["Kit comercial"],
    kitId: kit.id,
    priceVersion: kit.priceVersion,
  };
}

function guessHardwareImage(slug: string, categorySlug?: string): string {
  const hay = `${slug} ${categorySlug ?? ""}`.toLowerCase();
  if (hay.includes("impresora")) return "impresora-termica.svg";
  if (hay.includes("lector") || hay.includes("barra")) return "lector-barras.svg";
  if (hay.includes("balanza")) return "balanza.svg";
  if (hay.includes("cajon") || hay.includes("monedero")) return "cajon-monedero.svg";
  return "terminal-tactil.svg";
}

function mapPromotion(promo: ApiPromotion): Promotion {
  return {
    id: promo.id,
    slug: promo.code.toLowerCase(),
    title: promo.name,
    summary: promo.description ?? promo.name,
    ...(promo.validUntil ? { validUntil: promo.validUntil } : {}),
    ctaHref: promo.ctaHref ?? "/promociones",
    ctaLabel: promo.ctaLabel ?? "Ver promoción",
    status: mapFeatureStatus(promo.publicationStatus),
  };
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
    const promoBar =
      data.promoBannerMessage
        ? {
            message: data.promoBannerMessage,
            ...(data.promoBannerHref ? { href: data.promoBannerHref } : {}),
            ...(data.promoBannerCta ? { cta: data.promoBannerCta } : {}),
          }
        : null;
    return {
      source: "api",
      data: {
        promoBar,
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
  const data = await apiFetch<ApiPromotion[]>("/v1/promotions");
  if (data) {
    return { data: data.map(mapPromotion), source: "api" };
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
    const seen = new Set<string>();
    const features = plans.flatMap((plan) =>
      (plan.features ?? [])
        .filter((feature) => !feature.code || !HIDDEN_PUBLIC_FEATURE_CODES.has(feature.code))
        .map((feature, index) => {
          const key = feature.code ?? feature.label;
          if (seen.has(key)) return null;
          seen.add(key);
          return {
            id: `${plan.slug}-${key}-${index}`,
            name: feature.label,
            description: feature.description ?? `${plan.name}: ${feature.label}`,
            status: mapFeatureStatus(feature.commercialStatus),
          };
        })
        .filter((item): item is NonNullable<typeof item> => Boolean(item)),
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
  modality?: "MONTHLY" | "ANNUAL" | "PERPETUAL";
  priceLabel?: string;
  equipmentIds?: string[];
  city?: string;
  note?: string;
}): Promise<{ url: string; message: string; source: ApiSource }> {
  const data = await apiFetch<{ url: string; text: string }>("/v1/whatsapp/catalog-message", {
    method: "POST",
    body: JSON.stringify({
      planSlug: input.planSlug,
      planId: input.planId,
      modality: input.modality,
      priceLabel: input.priceLabel,
      utmSource: input.intent.slice(0, 40),
    }),
    cache: "no-store",
  });
  if (data?.url) return { url: data.url, message: data.text, source: "api" };

  const settings = draftSettings;
  const modalityLabel =
    input.modality === "ANNUAL" ? "Anual" : input.modality === "PERPETUAL" ? "Pago único" : input.modality === "MONTHLY" ? "Mensual" : null;
  const lines = [
    "Hola, quiero información de Camacho POS Colombia.",
    `Intención: ${input.intent}`,
    input.planSlug ? `Plan: ${input.planSlug}` : null,
    input.planId ? `Id: ${input.planId}` : null,
    modalityLabel ? `Modalidad: ${modalityLabel}` : null,
    input.priceLabel ? `Precio: ${input.priceLabel}` : null,
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

export async function getSocialLinks(): Promise<FetchResult<Array<{ platform: string; url: string }>>> {
  const data = await apiFetch<Array<{ platform: string; url: string }>>("/v1/content/social");
  if (data) return { data, source: "api" };
  return {
    source: "draft",
    data: [
      { platform: "facebook", url: "https://www.facebook.com/camachoposcolombia" },
      { platform: "instagram", url: "https://www.instagram.com/camachoposcolombia" },
      { platform: "youtube", url: "https://www.youtube.com/@camachoposcolombia" },
      { platform: "linkedin", url: "https://www.linkedin.com/company/camacho-pos-colombia" },
    ],
  };
}

export async function getCaptchaConfig(): Promise<{
  provider: string;
  siteKey: string | null;
  required: boolean;
}> {
  const data = await apiFetch<{ provider: string; siteKey: string | null; required: boolean }>(
    "/v1/crm/captcha-config",
  );
  if (data) return data;
  return { provider: "none", siteKey: null, required: false };
}

export async function submitDemoRequest(payload: Record<string, string>): Promise<{ ok: boolean; id?: string; error?: string }> {
  return submitTrialRequest({
    ...payload,
    fullName: payload.name ?? payload.fullName ?? "",
    notes: [payload.business, payload.city, payload.goals, payload.notes].filter(Boolean).join(" | "),
    consentDataTreatment: "true",
    consentTerms: "true",
  });
}

async function withCsrfHeaders(headers: Record<string, string> = {}): Promise<Record<string, string>> {
  if (typeof window === "undefined") return headers;
  try {
    const res = await fetch(`${getApiUrl()}/v1/security/csrf`, {
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) return headers;
    const data = (await res.json()) as { csrfToken?: string; headerName?: string };
    if (!data.csrfToken) return headers;
    return {
      ...headers,
      [data.headerName ?? "x-csrf-token"]: data.csrfToken,
    };
  } catch {
    return headers;
  }
}

export async function submitTrialRequest(
  payload: Record<string, string>,
): Promise<{
  ok: boolean;
  id?: string;
  error?: string;
  expiresAt?: string | null;
  accessToken?: string;
  statusPath?: string;
  status?: string;
}> {
  const rawPhone = (payload.phone ?? payload.phoneE164 ?? "").trim();
  const body = {
    fullName: payload.name ?? payload.fullName,
    email: payload.email,
    ...(rawPhone ? { phoneE164: rawPhone } : {}),
    companyName: payload.companyName ?? payload.business,
    sector: payload.sector,
    city: payload.city,
    notes: payload.notes ?? payload.goals,
    consentDataTreatment: payload.consentDataTreatment === "true" || payload.consentDataTreatment === "1",
    consentTerms: payload.consentTerms === "true" || payload.consentTerms === "1",
    sourcePath: "/prueba-5-dias",
    ...(payload.captchaToken ? { captchaToken: payload.captchaToken } : {}),
    ...(payload.website != null ? { website: payload.website } : { website: "" }),
  };
  const csrfHeaders = await withCsrfHeaders();
  const data = await apiFetch<{
    id?: string;
    expiresAt?: string | null;
    accessToken?: string;
    statusPath?: string;
    status?: string;
  }>("/v1/crm/trial", {
    method: "POST",
    body: JSON.stringify(body),
    cache: "no-store",
    credentials: "include",
    headers: csrfHeaders,
  } as ApiInit);
  if (data?.id) {
    return {
      ok: true,
      id: data.id,
      status: data.status,
      expiresAt: data.expiresAt ?? null,
      ...(data.accessToken ? { accessToken: data.accessToken } : {}),
      ...(data.statusPath ? { statusPath: data.statusPath } : {}),
    };
  }
  if (isDevelopment()) return { ok: true, id: `draft-trial-${Date.now()}`, status: "PENDING_ACTIVATION" };
  return { ok: false, error: "No se pudo registrar la prueba." };
}

export async function getTrialStatus(
  id: string,
  accessToken?: string,
): Promise<{
  id: string;
  status: string;
  startsAt: string | null;
  expiresAt: string | null;
  blocked: boolean;
  pendingActivation?: boolean;
  blockedReason: string | null;
  posLicenseProvisioning?: { activated: boolean; gap: string };
} | null> {
  if (!accessToken) return null;
  const data = await apiFetch<{
    id: string;
    status: string;
    startsAt: string | null;
    expiresAt: string | null;
    blocked: boolean;
    pendingActivation?: boolean;
    blockedReason: string | null;
    posLicenseProvisioning?: { activated: boolean; gap: string };
  }>(`/v1/crm/trial/${encodeURIComponent(id)}?token=${encodeURIComponent(accessToken)}`, {
    cache: "no-store",
  });
  return data ?? null;
}

export async function submitContact(payload: Record<string, string>): Promise<{ ok: boolean; id?: string }> {
  const rawPhone = (payload.phone ?? payload.phoneE164 ?? "").trim();
  const body = {
    fullName: payload.name ?? payload.fullName,
    email: payload.email,
    ...(rawPhone ? { phoneE164: rawPhone } : {}),
    companyName: payload.companyName,
    message: payload.message ?? payload.subject,
    sourcePath: "/contacto",
    ...(payload.captchaToken ? { captchaToken: payload.captchaToken } : {}),
    ...(payload.website != null ? { website: payload.website } : { website: "" }),
  };
  const csrfHeaders = await withCsrfHeaders();
  const data = await apiFetch<{ id?: string }>("/v1/crm/contact", {
    method: "POST",
    body: JSON.stringify(body),
    cache: "no-store",
    credentials: "include",
    headers: csrfHeaders,
  } as ApiInit);
  if (data) return { ok: true, ...(data.id ? { id: data.id } : {}) };
  if (isDevelopment()) return { ok: true, id: `draft-contact-${Date.now()}` };
  return { ok: false };
}

export type LeadPayload = {
  fullName: string;
  email: string;
  phoneE164?: string;
  companyName?: string;
  businessType?: string;
  source?: string;
  notes?: string;
  planId?: string;
  modality?: "MONTHLY" | "ANNUAL" | "PERPETUAL";
  solutionType?: "SOFTWARE" | "COMPLETE";
  departmentCode?: string;
  cityCode?: string;
  cajaQty?: number;
  branchQty?: number;
  consentDataTreatment: boolean;
  consentCommercial?: boolean;
  captchaToken?: string;
  website?: string;
};

export async function submitLead(payload: LeadPayload): Promise<{ ok: boolean; id?: string; error?: string }> {
  const csrfHeaders = await withCsrfHeaders();
  const res = await apiFetchRaw("/v1/crm/leads", {
    method: "POST",
    body: JSON.stringify({
      ...payload,
      website: payload.website ?? "",
    }),
    cache: "no-store",
    credentials: "include",
    headers: csrfHeaders,
  } as ApiInit);
  if (res.ok && res.body && typeof res.body === "object" && "id" in res.body) {
    return { ok: true, id: String((res.body as { id: string }).id) };
  }
  const errBody = res.body as { message?: string; code?: string } | null;
  return {
    ok: false,
    ...(errBody?.message || errBody?.code
      ? { error: errBody.message ?? errBody.code }
      : { error: `HTTP_${res.status}` }),
  };
}

export type DepartmentWithCities = {
  id: string;
  name: string;
  cities: Array<{ id: string; name: string }>;
};

export async function getDepartments(): Promise<FetchResult<DepartmentWithCities[]>> {
  const data = await apiFetch<DepartmentWithCities[]>("/v1/coverage/departments");
  if (data?.length) return { data, source: "api" };
  return draftOrThrow([
    {
      id: "11",
      name: "Bogotá, D.C.",
      cities: [{ id: "11001", name: "Bogotá, D.C." }],
    },
    {
      id: "05",
      name: "Antioquia",
      cities: [
        { id: "05001", name: "Medellín" },
        { id: "05088", name: "Bello" },
      ],
    },
  ]);
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

/**
 * Ensure a server cart session exists. Reuses cookie/localStorage token when still OPEN.
 * Server remains sole authority for totals; client never sends totals.
 */
async function ensureServerCartSession(): Promise<string | null> {
  const { getCartSessionToken, setCartSessionToken, clearCartSessionToken } = await import(
    "./cart-store"
  );
  const existing = getCartSessionToken();
  if (existing) {
    const probe = await apiFetchRaw(`/v1/cart/${existing}`, { method: "GET", cache: "no-store" });
    if (probe.ok) {
      const view = probe.body as ApiCart | null;
      if (view?.sessionToken && (view.status === "OPEN" || view.status === "CHECKOUT")) {
        return view.sessionToken;
      }
    }
    clearCartSessionToken();
  }

  const cartRes = await apiFetchRaw("/v1/cart", { method: "POST", cache: "no-store" });
  const cart = cartRes.body as ApiCart | null;
  if (!cartRes.ok || !cart?.sessionToken) return null;
  setCartSessionToken(cart.sessionToken);
  return cart.sessionToken;
}

export async function createCheckout(input: {
  items: CartItem[];
  customer: Record<string, string>;
}): Promise<{ id: string; status: CheckoutStatus; source: ApiSource } | null> {
  const { clearCartSessionToken, clearCart } = await import("./cart-store");

  const sessionToken = await ensureServerCartSession();
  if (!sessionToken) {
    if (!isDevelopment()) return null;
    return { id: `draft-chk-${Date.now()}`, status: "pendiente", source: "draft" };
  }

  for (const item of input.items) {
    const payload = cartItemToApiPayload(item);
    if (!payload) {
      if (!isDevelopment()) return null;
      return { id: `draft-chk-${Date.now()}`, status: "pendiente", source: "draft" };
    }
    const addRes = await apiFetchRaw(`/v1/cart/${sessionToken}/items`, {
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
      cartSessionToken: sessionToken,
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
  if (checkoutRes.ok && (data?.paymentReference || data?.id)) {
    // Cart converted / in checkout — drop session so a new open cart is created next time.
    clearCartSessionToken();
    clearCart();
    return {
      id: data.paymentReference ?? data.id,
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

function adminAuthHeaders(token?: string): Record<string, string> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (allowAdminTestFixture()) {
    headers["X-Admin-Test-Fixture"] = "GLOBAL_SUPERADMIN";
  }
  return headers;
}

export async function getAdminSession(token?: string): Promise<AdminSession> {
  if (allowAdminTestFixture()) {
    return { authenticated: true, role: "GLOBAL", displayName: "Fixture GLOBAL (prueba)" };
  }
  if (!token) return { authenticated: false, role: "NONE" };
  // Probe a GLOBAL-guarded endpoint; no dedicated /session route yet.
  const url = `${getApiUrl()}/v1/admin/catalog/plans`;
  try {
    const response = await fetch(url, {
      headers: adminAuthHeaders(token),
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
  if (!token && !allowAdminTestFixture()) return null;
  return apiFetch<T>(path, {
    headers: adminAuthHeaders(token),
    cache: "no-store",
  });
}

/** Browser-side admin mutations (fixture header only when NEXT_PUBLIC_ALLOW_ADMIN_TEST_FIXTURE=1). */
export async function adminMutate<T>(
  path: string,
  init: { method: "POST" | "PATCH" | "PUT" | "DELETE"; body?: unknown; token?: string },
): Promise<{ ok: boolean; status: number; data: T | null; error?: string }> {
  const res = await apiFetchRaw(path, {
    method: init.method,
    headers: {
      ...adminAuthHeaders(init.token),
      "Content-Type": "application/json",
    },
    ...(init.body !== undefined ? { body: JSON.stringify(init.body) } : {}),
    cache: "no-store",
  });
  if (!res.ok) {
    const err =
      res.body && typeof res.body === "object" && "message" in (res.body as object)
        ? JSON.stringify((res.body as { message: unknown }).message)
        : `HTTP ${res.status}`;
    return { ok: false, status: res.status, data: null, error: err };
  }
  return { ok: true, status: res.status, data: res.body as T };
}
