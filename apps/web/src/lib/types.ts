export type FeatureStatus = "disponible" | "en_certificacion" | "proximamente" | "no_publicada";

export type Money = {
  amountCents: number;
  currency: "COP";
};

export type Plan = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  priceMonthly: Money;
  priceYearly?: Money;
  highlights: string[];
  includesHardwareHint?: string;
  status: FeatureStatus;
  featured?: boolean;
};

export type Equipment = {
  id: string;
  slug: string;
  name: string;
  category: string;
  summary: string;
  description: string;
  price: Money;
  image: string;
  status: FeatureStatus;
  featured?: boolean;
  specs: string[];
};

export type Promotion = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  validUntil?: string;
  ctaHref: string;
  ctaLabel: string;
  status: FeatureStatus;
};

export type CoverageCity = {
  slug: string;
  name: string;
  department: string;
  summary: string;
  leadTimeDays: number;
  status: FeatureStatus;
};

export type SolutionSector = {
  slug: string;
  name: string;
  headline: string;
  summary: string;
  challenges: string[];
  capabilities: string[];
  image: string;
};

export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  publishedAt: string;
  readingMinutes: number;
  tags: string[];
  body: string[];
};

export type FaqItem = {
  id: string;
  question: string;
  answer: string;
  category: string;
};

export type FeatureFlag = {
  id: string;
  name: string;
  description: string;
  status: FeatureStatus;
};

export type SiteSettings = {
  promoBar?: {
    message: string;
    href?: string;
    cta?: string;
  } | null;
  whatsappNumber?: string;
  supportEmail?: string;
  supportPhone?: string;
  maintenanceMode?: boolean;
};

export type CartItem = {
  id: string;
  kind: "plan" | "equipment";
  refId: string;
  slug: string;
  name: string;
  quantity: number;
  unitPrice: Money;
};

export type Cart = {
  items: CartItem[];
  subtotal: Money;
  currency: "COP";
};

export type CheckoutStatus = "pendiente" | "pagado" | "rechazado" | "expirado";

export type AdminSession = {
  authenticated: boolean;
  role?: "GLOBAL" | "NONE";
  displayName?: string;
};

export type ApiSource = "api" | "draft";
