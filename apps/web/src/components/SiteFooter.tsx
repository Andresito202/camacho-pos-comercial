import Link from "next/link";
import Image from "next/image";
import { SocialIcons } from "@/components/SocialIcons";

const COLUMNS = [
  {
    title: "Producto",
    links: [
      { href: "/software-pos", label: "Software POS" },
      { href: "/planes", label: "Planes y precios" },
      { href: "/equipos", label: "Equipos" },
      { href: "/descargas", label: "Descargas" },
    ],
  },
  {
    title: "Comercial",
    links: [
      { href: "/contratar", label: "Contratar" },
      { href: "/prueba-5-dias", label: "Prueba 5 días" },
      { href: "/promociones", label: "Promociones" },
      { href: "/cobertura", label: "Cobertura" },
    ],
  },
  {
    title: "Empresa",
    links: [
      { href: "/nosotros", label: "Nosotros" },
      { href: "/blog", label: "Blog" },
      { href: "/contacto", label: "Contacto" },
      { href: "/soporte", label: "Soporte" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/legal/privacidad", label: "Privacidad" },
      { href: "/legal/terminos", label: "Términos" },
      { href: "/legal/tratamiento-de-datos", label: "Tratamiento de datos" },
      { href: "/preguntas-frecuentes", label: "Preguntas frecuentes" },
    ],
  },
];

export type FooterSocialLink = {
  platform: string;
  url: string;
};

export function SiteFooter({ socialLinks = [] }: { socialLinks?: FooterSocialLink[] }) {
  return (
    <footer className="mt-auto border-t border-[var(--border)] bg-[var(--navy)] text-[var(--ivory)]">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 sm:grid-cols-2 lg:grid-cols-[1.25fr_repeat(4,minmax(0,1fr))] lg:px-8">
        <div className="min-w-0 sm:col-span-2 lg:col-span-1">
          <Image
            src="/brand/logo-stacked.png"
            alt="Camacho POS Colombia"
            width={96}
            height={96}
            className="mb-4 h-16 w-auto rounded-lg bg-white/5 p-2"
          />
          <p className="text-2xl font-bold">Camacho POS Colombia</p>
          <p className="mt-3 max-w-xs text-sm text-white/70">
            Contabilidad y precisión siempre. Software POS y kits de equipos para el comercio colombiano.
          </p>
          <div className="mt-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--yellow)]">Síguenos</p>
            <SocialIcons links={socialLinks} tone="onDark" />
          </div>
        </div>
        {COLUMNS.map((column) => (
          <div key={column.title} className="min-w-0">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--yellow)]">{column.title}</p>
            <ul className="space-y-2 text-sm text-white/80">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="hover:text-white">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/10 px-4 py-4 text-center text-xs text-white/55 sm:px-6">
        © {new Date().getFullYear()} Camacho POS Colombia. Todos los derechos reservados.
      </div>
    </footer>
  );
}
