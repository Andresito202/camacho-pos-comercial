"use client";

import { useEffect, useState } from "react";
import { getCaptchaConfig } from "@/lib/api";

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: { sitekey: string; callback: (token: string) => void; "expired-callback"?: () => void },
      ) => string;
      reset: (widgetId?: string) => void;
    };
    grecaptcha?: {
      ready: (cb: () => void) => void;
      render: (el: HTMLElement, opts: { sitekey: string; callback: (token: string) => void }) => number;
      reset: (id?: number) => void;
    };
  }
}

/** Invisible honeypot — leave empty. */
export function HoneypotField() {
  return (
    <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden opacity-0">
      <label>
        Sitio web
        <input type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
      </label>
    </div>
  );
}

export function CaptchaField({
  onToken,
}: {
  onToken: (token: string | undefined) => void;
}) {
  const [config, setConfig] = useState<{ provider: string; siteKey: string | null; required: boolean } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void getCaptchaConfig()
      .then((cfg) => setConfig(cfg))
      .catch(() => setConfig({ provider: "none", siteKey: null, required: false }));
  }, []);

  useEffect(() => {
    if (!config?.siteKey || config.provider === "none") {
      onToken(undefined);
      return;
    }

    let cancelled = false;
    const mount = document.getElementById("camacho-captcha-slot");
    if (!mount) return;

    if (config.provider === "turnstile") {
      const scriptId = "cf-turnstile-script";
      const existing = document.getElementById(scriptId);
      const boot = () => {
        if (cancelled || !window.turnstile || !mount) return;
        mount.innerHTML = "";
        window.turnstile.render(mount, {
          sitekey: config.siteKey!,
          callback: (token) => onToken(token),
          "expired-callback": () => onToken(undefined),
        });
      };
      if (existing) {
        boot();
      } else {
        const script = document.createElement("script");
        script.id = scriptId;
        script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
        script.async = true;
        script.onload = boot;
        script.onerror = () => setError("No se pudo cargar Turnstile.");
        document.head.appendChild(script);
      }
      return () => {
        cancelled = true;
      };
    }

    if (config.provider === "recaptcha") {
      const scriptId = "grecaptcha-script";
      const existing = document.getElementById(scriptId);
      const boot = () => {
        if (cancelled || !window.grecaptcha || !mount) return;
        window.grecaptcha.ready(() => {
          mount.innerHTML = "";
          window.grecaptcha!.render(mount, {
            sitekey: config.siteKey!,
            callback: (token) => onToken(token),
          });
        });
      };
      if (existing) {
        boot();
      } else {
        const script = document.createElement("script");
        script.id = scriptId;
        script.src = "https://www.google.com/recaptcha/api.js?render=explicit";
        script.async = true;
        script.onload = boot;
        script.onerror = () => setError("No se pudo cargar reCAPTCHA.");
        document.head.appendChild(script);
      }
    }

    return () => {
      cancelled = true;
    };
  }, [config, onToken]);

  if (!config) {
    return <p className="text-xs text-[var(--muted)]">Cargando protección anti-bot…</p>;
  }

  if (config.provider === "none") {
    return (
      <p className="rounded-md border border-[var(--border)] bg-[var(--ivory)] px-3 py-2 text-xs text-[var(--muted)]">
        Protección anti-spam activa (honeypot + rate limit). Configura Turnstile o reCAPTCHA en producción.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div id="camacho-captcha-slot" className="min-h-[65px]" />
      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
    </div>
  );
}
