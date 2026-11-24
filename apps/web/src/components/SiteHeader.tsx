"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@camacho-pos/ui";
import { useCart } from "@/lib/cart-store";

const NAV = [
  { href: "/software-pos", label: "Software" },
  { href: "/planes", label: "Planes" },
  { href: "/equipos", label: "Equipos" },
  { href: "/soluciones", label: "Soluciones" },
  { href: "/cobertura", label: "Cobertura" },
  { href: "/soporte", label: "Soporte" },
];

export function SiteHeader({
  loginHref,
  loginBlockedReason,
}: {
  loginHref: string | null;
  loginBlockedReason?: string;
}) {
  const [open, setOpen] = useState(false);
  const { count } = useCart();

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--ivory)_88%,white)] backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3" aria-label="Camacho POS Colombia — inicio">
          <Image
            src="/brand/logo-yellow.png"
            alt="Camacho POS Colombia"
            width={180}
            height={64}
            className="h-10 w-auto sm:h-12"
            priority
          />
        </Link>

        <nav className="hidden items-center gap-5 lg:flex" aria-label="Principal">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="text-sm font-medium text-[var(--steel)] hover:text-[var(--navy)]">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/carrito"
            className="relative rounded-md px-3 py-2 text-sm font-medium text-[var(--navy)] hover:bg-[color-mix(in_srgb,var(--navy)_6%,transparent)]"
            aria-label={`Carrito${count ? `, ${count} artículos` : ""}`}
          >
            Carrito
            {count > 0 ? (
              <span className="ml-1 inline-flex min-w-5 items-center justify-center rounded bg-[var(--yellow)] px-1.5 text-xs font-bold">
                {count}
              </span>
            ) : null}
          </Link>

          {loginHref ? (
            <Button size="sm" onClick={() => { window.location.href = loginHref; }}>
              Iniciar sesión
            </Button>
          ) : (
            <Button
              size="sm"
              title={loginBlockedReason}
              onClick={() => {
                window.alert(
                  loginBlockedReason ??
                    "El inicio de sesión requiere Central Authority configurada.",
                );
              }}
            >
              Iniciar sesión
            </Button>
          )}

          <button
            type="button"
            className="inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((value) => !value)}
          >
            Menú
          </button>
        </div>
      </div>

      {open ? (
        <nav id="mobile-nav" className="border-t border-[var(--border)] px-4 py-3 lg:hidden" aria-label="Móvil">
          <ul className="space-y-2">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="block py-2 text-sm font-medium" onClick={() => setOpen(false)}>
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/buscar" className="block py-2 text-sm font-medium" onClick={() => setOpen(false)}>
                Buscar
              </Link>
            </li>
          </ul>
        </nav>
      ) : null}
    </header>
  );
}
