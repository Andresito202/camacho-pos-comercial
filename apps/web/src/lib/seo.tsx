import type { Metadata } from "next";
import { getSiteUrl, isStaging } from "./env";

export function buildMetadata({
  title,
  description,
  path = "/",
  noIndex = false,
}: {
  title: string;
  description: string;
  path?: string;
  noIndex?: boolean;
}): Metadata {
  const site = getSiteUrl();
  const url = `${site}${path}`;
  const fullTitle = path === "/" ? title : `${title} | Camacho POS Colombia`;
  const blockIndexing = noIndex || isStaging();
  const ogImage = `${site}/brand/logo-yellow.png`;

  return {
    metadataBase: new URL(site),
    title: fullTitle,
    description,
    alternates: { canonical: url },
    robots: blockIndexing
      ? { index: false, follow: false, nocache: true }
      : { index: true, follow: true },
    openGraph: {
      title: fullTitle,
      description,
      url,
      siteName: "Camacho POS Colombia",
      locale: "es_CO",
      type: "website",
      images: [{ url: ogImage, alt: "Camacho POS Colombia" }],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [ogImage],
    },
  };
}

export function organizationJsonLd() {
  const site = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Camacho POS Colombia",
    url: site,
    logo: `${site}/brand/symbol.png`,
    slogan: "Contabilidad y precisión siempre.",
    areaServed: "CO",
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "sales",
        email: "ventas@camachoposcolombia.com",
        availableLanguage: ["Spanish"],
      },
    ],
  };
}

export function websiteJsonLd() {
  const site = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Camacho POS Colombia",
    url: site,
    potentialAction: {
      "@type": "SearchAction",
      target: `${site}/buscar?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function breadcrumbJsonLd(items: Array<{ name: string; path: string }>) {
  const site = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${site}${item.path}`,
    })),
  };
}

export function productJsonLd(input: {
  name: string;
  description: string;
  path: string;
  sku: string;
  priceCents: number;
  availability: "InStock" | "PreOrder" | "OutOfStock";
}) {
  const site = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: input.name,
    description: input.description,
    sku: input.sku,
    brand: { "@type": "Brand", name: "Camacho POS Colombia" },
    url: `${site}${input.path}`,
    offers: {
      "@type": "Offer",
      priceCurrency: "COP",
      price: (input.priceCents / 100).toFixed(0),
      availability: `https://schema.org/${input.availability}`,
      url: `${site}${input.path}`,
    },
  };
}

export function faqJsonLd(items: Array<{ question: string; answer: string }>) {
  const usable = items.filter((item) => item.question.trim() && item.answer.trim());
  if (usable.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: usable.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

export function JsonLd({
  data,
}: {
  data: Record<string, unknown> | Array<Record<string, unknown>> | null | undefined;
}) {
  if (!data) return null;
  if (Array.isArray(data) && data.length === 0) return null;
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
