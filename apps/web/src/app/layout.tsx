import type { Metadata, Viewport } from "next";
import { PromoBar } from "@camacho-pos/ui";
import Link from "next/link";
import { CommercialAssistant } from "@/components/CommercialAssistant";
import { DraftBanner } from "@/components/DraftBanner";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { WhatsAppLauncher } from "@/components/WhatsAppLauncher";
import { getFaq, getSettings, getSocialLinks } from "@/lib/api";
import { getLoginHref } from "@/lib/auth";
import { buildMetadata, JsonLd, organizationJsonLd, websiteJsonLd } from "@/lib/seo";
import "@/styles/globals.css";

export const metadata: Metadata = buildMetadata({
  title: "Camacho POS Colombia | Software POS y kits para tu negocio",
  description:
    "Vende, controla y haz crecer tu negocio con Camacho POS Colombia. Software POS, planes y equipos para tiendas, droguerías, panaderías y más.",
  path: "/",
});

export const viewport: Viewport = {
  themeColor: "#0B1A2C",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [settings, social, faq] = await Promise.all([
    getSettings().catch(() => ({
      data: {
        promoBar: null,
        whatsappNumber: undefined,
        maintenanceMode: false,
      },
      source: "draft" as const,
    })),
    getSocialLinks().catch(() => ({ data: [], source: "draft" as const })),
    getFaq().catch(() => ({ data: [], source: "draft" as const })),
  ]);
  const login = getLoginHref("/admin");

  if (settings.data.maintenanceMode) {
    return (
      <html lang="es-CO">
        <body>
          <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-4 text-center">
            <h1 className="text-4xl font-bold">Mantenimiento</h1>
            <p className="mt-4 text-[var(--muted)]">
              Estamos realizando mejoras programadas. Vuelve pronto o escribe a soporte.
            </p>
            <Link href="/mantenimiento" className="mt-6 underline">
              Más información
            </Link>
          </main>
        </body>
      </html>
    );
  }

  return (
    <html lang="es-CO">
      <body className="flex min-h-screen flex-col antialiased">
        <JsonLd data={[organizationJsonLd(), websiteJsonLd()]} />
        {settings.data.promoBar?.message ? (
          <PromoBar
            message={settings.data.promoBar.message}
            href={settings.data.promoBar.href}
            cta={settings.data.promoBar.cta}
            linkAs={(href: string, label: React.ReactNode) => (
              <Link href={href} className="font-semibold underline underline-offset-2">
                {label}
              </Link>
            )}
          />
        ) : null}
        <DraftBanner source={settings.source} />
        <SiteHeader
          loginHref={login.href}
          {...(login.reason ? { loginBlockedReason: login.reason } : {})}
        />
        <main className="min-w-0 flex-1">{children}</main>
        <SiteFooter socialLinks={social.data} />
        <WhatsAppLauncher
          {...(settings.data.whatsappNumber ? { number: settings.data.whatsappNumber } : {})}
        />
        <CommercialAssistant
          faq={faq.data.map((item) => ({ id: item.id, question: item.question, answer: item.answer }))}
          whatsappNumber={settings.data.whatsappNumber}
        />
      </body>
    </html>
  );
}
