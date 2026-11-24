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
    <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--ivory)_90%,white)] backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6 lg:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-3" aria-label="Camacho POS Colombia — inicio">
          <Image
            src="/brand/logo-yellow.png"
            alt="Camacho POS Colombia"
            width={200}
            height={72}
            className="h-10 w-auto sm:h-11"
            priority
          />
        </Link>

        <nav className="hidden items-center gap-4 xl:gap-5 lg:flex" aria-label="Principal">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="inline-flex min-h-11 items-center text-sm font-semibold text-[var(--steel)] hover:text-[var(--navy)]"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-2.5">
          <Link
            href="/carrito"
            className="relative inline-flex min-h-11 items-center rounded-md px-2.5 py-2 text-sm font-medium text-[var(--navy)] hover:bg-[color-mix(in_srgb,var(--navy)_6%,transparent)]"
            aria-label={`Carrito${count ? `, ${count} artículos` : ""}`}
          >
            Carrito
            {count > 0 ? (
              <span className="ml-1 inline-flex min-w-5 items-center justify-center rounded bg-[var(--yellow)] px-1.5 text-xs font-bold">
                {count}
              </span>
            ) : null}
          </Link>

          <Button size="sm" title={loginBlockedReason} onClick={goLogin}>
            Iniciar sesión
          </Button>

          <button
            type="button"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md px-3 py-2.5 text-sm font-medium text-[var(--navy)] lg:hidden"
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
        <nav id="mobile-nav" className="border-t border-[var(--border)] bg-[var(--ivory)] px-4 py-3 lg:hidden" aria-label="Móvil">
          <ul className="space-y-1">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="block rounded-md px-2 py-2.5 text-sm font-semibold text-[var(--navy)] hover:bg-white/70"
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/solicitar-demo"
                className="block rounded-md px-2 py-2.5 text-sm font-medium text-[var(--teal)]"
                onClick={() => setOpen(false)}
              >
                Solicitar demo
              </Link>
            </li>
            <li>
              <Link
                href="/buscar"
                className="block rounded-md px-2 py-2.5 text-sm font-medium"
                onClick={() => setOpen(false)}
              >
                Buscar
              </Link>
            </li>
          </ul>
        </nav>
      ) : null}
    </header>
  );
}
