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
import { getApiUrl, isDevelopment } from "./env";
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
  Plan,
  Promotion,
  SiteSettings,
  SolutionSector,
} from "./types";

export type FetchResult<T> = {
  data: T;
  source: ApiSource;
};

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T | null> {
  const url = `${getApiUrl()}${path}`;
  try {
    const response = await fetch(url, {
      ...init,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
      next: init?.cache === "no-store" ? undefined : { revalidate: 60 },
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function draftOrThrow<T>(data: T): FetchResult<T> {
  if (!isDevelopment()) {
    throw new Error("commercial-api no disponible y no hay preview DRAFT en producción");
  }
  return { data, source: "draft" };
}

export async function getSettings(): Promise<FetchResult<SiteSettings>> {
  const data = await apiFetch<SiteSettings>("/v1/public/settings");
  if (data) return { data, source: "api" };
  return draftOrThrow(draftSettings);
}

export async function getPlans(): Promise<FetchResult<Plan[]>> {
  const data = await apiFetch<Plan[]>("/v1/public/plans");
  if (data) return { data, source: "api" };
  return draftOrThrow(draftPlans);
}

export async function getPlan(slug: string): Promise<FetchResult<Plan | null>> {
  const data = await apiFetch<Plan>(`/v1/public/plans/${slug}`);
  if (data) return { data, source: "api" };
  const draft = draftPlans.find((plan) => plan.slug === slug) ?? null;
  return draftOrThrow(draft);
}

export async function getEquipmentList(): Promise<FetchResult<Equipment[]>> {
  const data = await apiFetch<Equipment[]>("/v1/public/equipment");
  if (data) return { data, source: "api" };
  return draftOrThrow(draftEquipment);
}

export async function getEquipment(slug: string): Promise<FetchResult<Equipment | null>> {
  const data = await apiFetch<Equipment>(`/v1/public/equipment/${slug}`);
  if (data) return { data, source: "api" };
  const draft = draftEquipment.find((item) => item.slug === slug) ?? null;
  return draftOrThrow(draft);
}

export async function getPromotions(): Promise<FetchResult<Promotion[]>> {
  const data = await apiFetch<Promotion[]>("/v1/public/promotions");
  if (data) return { data, source: "api" };
  return draftOrThrow(draftPromotions);
}

export async function getCoverage(): Promise<FetchResult<CoverageCity[]>> {
  const data = await apiFetch<CoverageCity[]>("/v1/public/coverage");
  if (data) return { data, source: "api" };
  return draftOrThrow(draftCoverage);
}

export async function getCoverageCity(slug: string): Promise<FetchResult<CoverageCity | null>> {
  const data = await apiFetch<CoverageCity>(`/v1/public/coverage/${slug}`);
  if (data) return { data, source: "api" };
  const draft = draftCoverage.find((city) => city.slug === slug) ?? null;
  return draftOrThrow(draft);
}

export async function getSolutions(): Promise<FetchResult<SolutionSector[]>> {
  const data = await apiFetch<SolutionSector[]>("/v1/public/solutions");
  if (data) return { data, source: "api" };
  return draftOrThrow(draftSolutions);
}

export async function getSolution(slug: string): Promise<FetchResult<SolutionSector | null>> {
  const data = await apiFetch<SolutionSector>(`/v1/public/solutions/${slug}`);
  if (data) return { data, source: "api" };
  const draft = draftSolutions.find((item) => item.slug === slug) ?? null;
  return draftOrThrow(draft);
}

export async function getFaq(): Promise<FetchResult<FaqItem[]>> {
  const data = await apiFetch<FaqItem[]>("/v1/public/faq");
  if (data) return { data, source: "api" };
  return draftOrThrow(draftFaq);
}

export async function getFeatures(): Promise<FetchResult<FeatureFlag[]>> {
  const data = await apiFetch<FeatureFlag[]>("/v1/public/features");
  if (data) return { data, source: "api" };
  return draftOrThrow(draftFeatures);
}

export async function getBlogPosts(): Promise<FetchResult<BlogPost[]>> {
  const data = await apiFetch<BlogPost[]>("/v1/public/blog");
  if (data) return { data, source: "api" };
  return draftOrThrow(draftBlog);
}

export async function getBlogPost(slug: string): Promise<FetchResult<BlogPost | null>> {
  const data = await apiFetch<BlogPost>(`/v1/public/blog/${slug}`);
  if (data) return { data, source: "api" };
  const draft = draftBlog.find((post) => post.slug === slug) ?? null;
  return draftOrThrow(draft);
}

export async function buildWhatsAppMessage(input: {
  intent: string;
  planId?: string;
  equipmentIds?: string[];
  city?: string;
  note?: string;
}): Promise<{ url: string; message: string; source: ApiSource }> {
  const data = await apiFetch<{ url: string; message: string }>("/v1/public/whatsapp/build", {
    method: "POST",
    body: JSON.stringify(input),
    cache: "no-store",
  });
  if (data) return { ...data, source: "api" };

  const settings = draftSettings;
  const lines = [
    "Hola, quiero información de Camacho POS Colombia.",
    `Intención: ${input.intent}`,
    input.planId ? `Plan: ${input.planId}` : null,
    input.equipmentIds?.length ? `Equipos: ${input.equipmentIds.join(", ")}` : null,
    input.city ? `Ciudad: ${input.city}` : null,
    input.note ? `Nota: ${input.note}` : null,
  ].filter(Boolean);
  const message = lines.join("\n");
  const number = settings.whatsappNumber ?? "573001112233";
  const url = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
  if (!isDevelopment()) {
    throw new Error("No se pudo construir el mensaje de WhatsApp");
  }
  return { url, message, source: "draft" };
}

export async function submitDemoRequest(payload: Record<string, string>): Promise<{ ok: boolean; id?: string }> {
  const data = await apiFetch<{ ok: boolean; id?: string }>("/v1/public/demo-requests", {
    method: "POST",
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  if (data) return data;
  if (isDevelopment()) return { ok: true, id: `draft-demo-${Date.now()}` };
  return { ok: false };
}

export async function submitContact(payload: Record<string, string>): Promise<{ ok: boolean; id?: string }> {
  const data = await apiFetch<{ ok: boolean; id?: string }>("/v1/public/contact", {
    method: "POST",
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  if (data) return data;
  if (isDevelopment()) return { ok: true, id: `draft-contact-${Date.now()}` };
  return { ok: false };
}

export async function quoteCart(items: CartItem[]): Promise<FetchResult<Cart>> {
  const data = await apiFetch<Cart>("/v1/public/cart/quote", {
    method: "POST",
    body: JSON.stringify({ items }),
    cache: "no-store",
  });
  if (data) return { data, source: "api" };
  const subtotalCents = items.reduce((sum, item) => sum + item.unitPrice.amountCents * item.quantity, 0);
  return draftOrThrow({
    items,
    subtotal: { amountCents: subtotalCents, currency: "COP" },
    currency: "COP",
  });
}

export async function createCheckout(input: {
  items: CartItem[];
  customer: Record<string, string>;
}): Promise<{ id: string; status: CheckoutStatus; source: ApiSource } | null> {
  const data = await apiFetch<{ id: string; status: CheckoutStatus }>("/v1/public/checkout", {
    method: "POST",
    body: JSON.stringify(input),
    cache: "no-store",
  });
  if (data) return { ...data, source: "api" };
  if (!isDevelopment()) return null;
  return { id: `draft-chk-${Date.now()}`, status: "pendiente", source: "draft" };
}

export async function getCheckoutStatus(id: string): Promise<FetchResult<{ id: string; status: CheckoutStatus }> | null> {
  const data = await apiFetch<{ id: string; status: CheckoutStatus }>(`/v1/public/checkout/${id}/status`, {
    cache: "no-store",
  });
  if (data) return { data, source: "api" };
  if (isDevelopment() && id.startsWith("draft-")) {
    return { data: { id, status: "pendiente" }, source: "draft" };
  }
  return null;
}

export async function getAdminSession(token?: string): Promise<AdminSession> {
  if (!token) return { authenticated: false, role: "NONE" };
  const data = await apiFetch<AdminSession>("/v1/admin/session", {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (data) return data;
  return { authenticated: false, role: "NONE" };
}

export async function adminFetch<T>(path: string, token?: string): Promise<T | null> {
  if (!token) return null;
  return apiFetch<T>(path, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
}
