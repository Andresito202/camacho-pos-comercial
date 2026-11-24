"use client";

import { useEffect, useState } from "react";
import type { CartItem, Money } from "./types";

const STORAGE_KEY = "camacho-pos-cart-v1";
const SESSION_STORAGE_KEY = "camacho-pos-cart-session-v1";
const SESSION_COOKIE = "camacho_cart_session";

function read(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(items: CartItem[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("camacho-cart-changed"));
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  const value = match?.[1];
  return value ? decodeURIComponent(value) : null;
}

function writeSessionCookie(token: string | null) {
  if (typeof document === "undefined") return;
  if (!token) {
    document.cookie = `${SESSION_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
    return;
  }
  // 7 days — mirrors localStorage cart session persistence for same-origin pages.
  document.cookie = `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=604800; SameSite=Lax`;
}

/** Server cart session token (cookie + localStorage). Totals remain server-authoritative. */
export function getCartSessionToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const fromStorage = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (fromStorage && fromStorage.length >= 10) return fromStorage;
  } catch {
    /* ignore */
  }
  const fromCookie = readCookie(SESSION_COOKIE);
  return fromCookie && fromCookie.length >= 10 ? fromCookie : null;
}

export function setCartSessionToken(token: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SESSION_STORAGE_KEY, token);
  writeSessionCookie(token);
  window.dispatchEvent(new Event("camacho-cart-session-changed"));
}

export function clearCartSessionToken() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SESSION_STORAGE_KEY);
  writeSessionCookie(null);
  window.dispatchEvent(new Event("camacho-cart-session-changed"));
}

export function getCartItems(): CartItem[] {
  return read();
}

export function addCartItem(item: Omit<CartItem, "quantity"> & { quantity?: number }) {
  const items = read();
  const existing = items.find((row) => row.kind === item.kind && row.refId === item.refId);
  if (existing) {
    existing.quantity += item.quantity ?? 1;
  } else {
    items.push({ ...item, quantity: item.quantity ?? 1 });
  }
  write(items);
}

export function updateCartQuantity(id: string, quantity: number) {
  const items = read()
    .map((item) => (item.id === id ? { ...item, quantity } : item))
    .filter((item) => item.quantity > 0);
  write(items);
}

export function removeCartItem(id: string) {
  write(read().filter((item) => item.id !== id));
}

export function clearCart() {
  write([]);
  clearCartSessionToken();
}

export function cartSubtotal(items: CartItem[]): Money {
  return {
    amountCents: items.reduce((sum, item) => sum + item.unitPrice.amountCents * item.quantity, 0),
    currency: "COP",
  };
}

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    const sync = () => setItems(read());
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("camacho-cart-changed", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("camacho-cart-changed", sync);
    };
  }, []);

  return {
    items,
    count: items.reduce((sum, item) => sum + item.quantity, 0),
    subtotal: cartSubtotal(items),
    add: addCartItem,
    update: updateCartQuantity,
    remove: removeCartItem,
    clear: clearCart,
    sessionToken: typeof window !== "undefined" ? getCartSessionToken() : null,
  };
}
