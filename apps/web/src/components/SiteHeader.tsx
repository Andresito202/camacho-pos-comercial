"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@camacho-pos/ui";
import { useCart } from "@/lib/cart-store";

const NAV = [
  { href: "/software-pos", label: "Software POS" },
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

  function goLogin() {
    if (loginHref) {
      window.location.href = loginHref;
      return;
    }
    window.alert(
      loginBlockedReason ?? "El inicio de sesión requiere el servicio de acceso configurado.",
    );
  }

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] backdrop-blur">
      <div className="mx-auto flex max-w-6xl min-w-0 items-center justify-between gap-2 px-3 py-2 sm:gap-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex min-w-0 shrink items-center gap-2" aria-label="Camacho POS Colombia — inicio">
          <Image
            src="/brand/logo-yellow.png"
            alt="Camacho POS Colombia"
            width={200}
            height={72}
            className="h-9 w-auto max-w-[9.5rem] object-contain sm:h-11 sm:max-w-none"
            priority
          />
        </Link>

        <nav className="hidden min-w-0 items-center gap-1 xl:gap-3 lg:flex" aria-label="Principal">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="inline-flex min-h-11 max-w-[7.5rem] items-center truncate px-1 text-sm font-semibold text-[var(--steel)] hover:text-[var(--navy)] xl:max-w-none"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <Link
            href="/prueba-5-dias"
            className="hidden min-h-11 items-center rounded-md bg-[var(--yellow)] px-3 py-2 text-sm font-bold text-[var(--navy)] hover:brightness-95 md:inline-flex"
          >
            Prueba 5 días
          </Link>
          <Link
            href="/contratar"
            className="hidden min-h-11 items-center rounded-md border border-[var(--navy)] px-3 py-2 text-sm font-bold text-[var(--navy)] hover:bg-[color-mix(in_srgb,var(--navy)_6%,transparent)] lg:inline-flex"
          >
            Contratar
          </Link>
          <Link
            href="/carrito"
            className="relative inline-flex min-h-11 items-center rounded-md px-2 py-2 text-sm font-semibold text-[var(--navy)] hover:bg-[color-mix(in_srgb,var(--navy)_6%,transparent)]"
            aria-label={`Carrito${count ? `, ${count} artículos` : ""}`}
          >
            Carrito
            {count > 0 ? (
              <span className="ml-1 inline-flex min-w-5 items-center justify-center rounded bg-[var(--yellow)] px-1.5 text-xs font-bold">
                {count}
              </span>
            ) : null}
          </Link>

          <Button size="sm" className="hidden sm:inline-flex" title={loginBlockedReason} onClick={goLogin}>
            Iniciar sesión
          </Button>

          <button
            type="button"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md px-3 py-2.5 text-sm font-semibold text-[var(--navy)] lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? "Cerrar" : "Menú"}
          </button>
        </div>
      </div>

      {open ? (
        <nav id="mobile-nav" className="border-t border-[var(--border)] bg-[var(--surface)] px-4 py-3 lg:hidden" aria-label="Móvil">
          <ul className="space-y-1">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="block rounded-md px-2 py-2.5 text-sm font-semibold text-[var(--navy)] hover:bg-[var(--ivory)]"
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/prueba-5-dias"
                className="block rounded-md px-2 py-2.5 text-sm font-bold text-[var(--teal)]"
                onClick={() => setOpen(false)}
              >
                Prueba 5 días
              </Link>
            </li>
            <li>
              <Link
                href="/contratar"
                className="block rounded-md px-2 py-2.5 text-sm font-semibold"
                onClick={() => setOpen(false)}
              >
                Contratar
              </Link>
            </li>
            <li>
              <button
                type="button"
                className="block w-full rounded-md px-2 py-2.5 text-left text-sm font-semibold"
                onClick={() => {
                  setOpen(false);
                  goLogin();
                }}
              >
                Iniciar sesión
              </button>
            </li>
          </ul>
        </nav>
      ) : null}
    </header>
  );
}
