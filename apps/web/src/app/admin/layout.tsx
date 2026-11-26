import Link from "next/link";
import { AdminTestBanner } from "@/components/admin/AdminTestBanner";
import { requireGlobalAdmin } from "@/lib/auth";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Admin comercial",
  description: "Panel superadmin comercial Camacho POS Colombia.",
  path: "/admin",
  noIndex: true,
});

const NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/planes", label: "Planes / precios" },
  { href: "/admin/equipos", label: "Productos / inventario" },
  { href: "/admin/pedidos", label: "Pedidos" },
  { href: "/admin/pagos", label: "Pagos" },
  { href: "/admin/clientes", label: "Clientes / solicitudes" },
  { href: "/admin/contenidos", label: "Contenidos / SEO" },
  { href: "/admin/promociones", label: "Promociones / cupones" },
  { href: "/admin/tickets", label: "Tickets" },
  { href: "/admin/ajustes", label: "WhatsApp / banners" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const access = await requireGlobalAdmin();
  if (!access.ok) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 sm:px-6">
        <h1 className="font-serif text-3xl">Acceso denegado</h1>
        <p className="mt-4 text-[var(--muted)]">{access.reason}</p>
        <p className="mt-3 text-sm text-[var(--steel)]">
          Inicia sesión en Central Authority con autoridad GLOBAL. Este panel no concede caja ni carrito de mostrador.
        </p>
        <Link href="/descargas" className="mt-6 inline-block text-[var(--teal)] underline">Ver destino por rol / descargas</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 lg:grid-cols-[220px_1fr] sm:px-6">
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--teal)]">Admin GLOBAL</p>
        <p className="mt-1 text-sm text-[var(--muted)]">{access.session.displayName ?? "Superadmin"}</p>
        <nav className="mt-4 space-y-1" aria-label="Admin">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="block rounded px-2 py-1.5 text-sm hover:bg-white/70">
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div>
        <AdminTestBanner />
        {children}
      </div>
    </div>
  );
}
