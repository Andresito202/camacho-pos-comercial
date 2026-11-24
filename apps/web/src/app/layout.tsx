import type { Metadata, Viewport } from "next";
import { DM_Sans, Source_Serif_4 } from "next/font/google";
import { PromoBar } from "@camacho-pos/ui";
import Link from "next/link";
import { DraftBanner } from "@/components/DraftBanner";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { WhatsAppLauncher } from "@/components/WhatsAppLauncher";
import { getSettings } from "@/lib/api";
import { getLoginHref } from "@/lib/auth";
import { buildMetadata, JsonLd, organizationJsonLd, websiteJsonLd } from "@/lib/seo";
import "@/styles/globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-source-serif",
  display: "swap",
});

export const metadata: Metadata = buildMetadata({
  title: "Camacho POS Colombia | Software POS y kits para tu negocio",
  description:
    "Vende, controla y haz crecer tu negocio con Camacho POS Colombia. Software POS, planes y equipos para tiendas, droguerías, panaderías y más.",
  path: "/",
});

export const viewport: Viewport = {
  themeColor: "#101C2D",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings().catch(() => ({
    data: {
      promoBar: null,
      whatsappNumber: undefined,
      maintenanceMode: false,
    },
    source: "draft" as const,
  }));
  const login = getLoginHref("/admin");

  if (settings.data.maintenanceMode) {
    return (
      <html lang="es-CO" className={`${dmSans.variable} ${sourceSerif.variable}`}>
        <body>
          <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-4 text-center">
            <h1 className="font-serif text-4xl">Mantenimiento</h1>
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
    <html lang="es-CO" className={`${dmSans.variable} ${sourceSerif.variable}`}>
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
        <main className="flex-1">{children}</main>
        <SiteFooter />
        <WhatsAppLauncher
          {...(settings.data.whatsappNumber ? { number: settings.data.whatsappNumber } : {})}
        />
      </body>
    </html>
  );
}
