"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button, Modal } from "@camacho-pos/ui";
import {
  buildWhatsAppMessage,
  getDepartments,
  submitLead,
  type DepartmentWithCities,
} from "@/lib/api";
import { addCartItem } from "@/lib/cart-store";
import { formatMoney, isPubliclySellable } from "@/lib/format";
import type { BillingInterval, Plan } from "@/lib/types";

const BUSINESS_TYPES = [
  "Tienda",
  "Supermercado",
  "Droguería",
  "Avícola",
  "Panadería",
  "Pastelería",
  "Otro",
];

type HireFormState = {
  fullName: string;
  email: string;
  phoneE164: string;
  companyName: string;
  businessType: string;
  departmentCode: string;
  cityCode: string;
  cajaQty: number;
  branchQty: number;
  solutionType: "SOFTWARE" | "COMPLETE";
  consentDataTreatment: boolean;
  consentCommercial: boolean;
};

const initialForm = (solutionType: "SOFTWARE" | "COMPLETE"): HireFormState => ({
  fullName: "",
  email: "",
  phoneE164: "",
  companyName: "",
  businessType: "",
  departmentCode: "",
  cityCode: "",
  cajaQty: 1,
  branchQty: 1,
  solutionType,
  consentDataTreatment: false,
  consentCommercial: false,
});

function modalityLabel(modality: BillingInterval) {
  if (modality === "ANNUAL") return "Anual";
  if (modality === "PERPETUAL") return "Pago único";
  return "Mensual";
}

export function HireModalTrigger({
  plan,
  modality = "MONTHLY",
  solutionType = "SOFTWARE",
  intent = "hire",
}: {
  plan: Plan;
  modality?: BillingInterval;
  solutionType?: "SOFTWARE" | "COMPLETE";
  intent?: "hire" | "whatsapp";
}) {
  const [open, setOpen] = useState(false);
  const sellable = isPubliclySellable(plan.status);
  const draftPreview = plan.status === "borrador";
  const canOpen = sellable || draftPreview;

  if (intent === "whatsapp") {
    return (
      <>
        <Button
          size="sm"
          variant="outline"
          disabled={!canOpen}
          onClick={() => setOpen(true)}
          title={canOpen ? "Abrir formulario y consultar por WhatsApp" : "Plan no disponible"}
        >
          Consultar WhatsApp
        </Button>
        <HireModal
          open={open}
          onClose={() => setOpen(false)}
          plan={plan}
          modality={modality}
          solutionType={solutionType}
          draftPreview={draftPreview}
          sellable={sellable}
          preferWhatsApp
        />
      </>
    );
  }

  return (
    <>
      <Button
        size="sm"
        disabled={!canOpen}
        title={
          canOpen
            ? draftPreview
              ? "Precio de referencia: sin cobro real hasta publicar precios"
              : undefined
            : "Este plan aún no está disponible para contratación"
        }
        onClick={() => setOpen(true)}
      >
        Contratar
      </Button>
      <HireModal
        open={open}
        onClose={() => setOpen(false)}
        plan={plan}
        modality={modality}
        solutionType={solutionType}
        draftPreview={draftPreview}
        sellable={sellable}
      />
    </>
  );
}

function HireModal({
  open,
  onClose,
  plan,
  modality,
  solutionType,
  draftPreview,
  sellable,
  preferWhatsApp = false,
}: {
  open: boolean;
  onClose: () => void;
  plan: Plan;
  modality: BillingInterval;
  solutionType: "SOFTWARE" | "COMPLETE";
  draftPreview: boolean;
  sellable: boolean;
  preferWhatsApp?: boolean;
}) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<HireFormState>(() => initialForm(solutionType));
  const [departments, setDepartments] = useState<DepartmentWithCities[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setForm(initialForm(solutionType));
    setStep(1);
    setMessage(null);
    setError(null);
    void getDepartments()
      .then((res) => setDepartments(res.data))
      .catch(() => setDepartments([]));
  }, [open, solutionType]);

  const cities = useMemo(() => {
    return departments.find((d) => d.id === form.departmentCode)?.cities ?? [];
  }, [departments, form.departmentCode]);

  const priceLabel = `${formatMoney(plan.priceMonthly)}${
    modality === "PERPETUAL" ? " pago único" : modality === "ANNUAL" ? " / año" : " / mes"
  }`;

  function update<K extends keyof HireFormState>(key: K, value: HireFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function validateStep1() {
    if (form.fullName.trim().length < 2) return "Indica tu nombre completo.";
    if (!form.email.includes("@")) return "Indica un correo válido.";
    if (form.phoneE164.trim().length < 8) return "Indica un teléfono de contacto.";
    return null;
  }

  function validateStep2() {
    if (form.companyName.trim().length < 2) return "Indica el nombre del negocio.";
    if (!form.businessType) return "Selecciona el tipo de negocio.";
    if (!form.departmentCode) return "Selecciona el departamento.";
    if (!form.cityCode) return "Selecciona la ciudad.";
    if (form.cajaQty < 1) return "Indica al menos 1 caja.";
    if (form.branchQty < 1) return "Indica al menos 1 sucursal.";
    return null;
  }

  function validateConsents() {
    if (!form.consentDataTreatment) {
      return "Debes aceptar el tratamiento de datos para continuar.";
    }
    return null;
  }

  async function buildLeadPayload() {
    return {
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      phoneE164: form.phoneE164.trim(),
      companyName: form.companyName.trim(),
      businessType: form.businessType,
      source: "hire-modal",
      notes: [
        `Plan: ${plan.name} (${plan.slug})`,
        `Modalidad: ${modality}`,
        `Solución: ${form.solutionType}`,
        `Cajas: ${form.cajaQty}`,
        `Sucursales: ${form.branchQty}`,
      ].join(" | "),
      planId: plan.id,
      modality,
      solutionType: form.solutionType,
      departmentCode: form.departmentCode,
      cityCode: form.cityCode,
      cajaQty: form.cajaQty,
      branchQty: form.branchQty,
      consentDataTreatment: form.consentDataTreatment,
      consentCommercial: form.consentCommercial,
    };
  }

  async function onRequestAdvice() {
    const err = validateStep1() || validateStep2() || validateConsents();
    if (err) {
      setError(err);
      setStep(3);
      return;
    }
    setSubmitting(true);
    setError(null);
    const result = await submitLead(await buildLeadPayload());
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error ?? "No se pudo registrar la solicitud. Intenta de nuevo.");
      return;
    }
    setMessage(`Solicitud registrada (ref. ${result.id}). Un asesor te contactará.`);
  }

  function onAddToCart() {
    addCartItem({
      id: `plan-${plan.planPriceId ?? plan.id}`,
      kind: "plan",
      refId: plan.planPriceId ?? plan.id,
      slug: plan.slug,
      name: plan.name,
      unitPrice: plan.priceMonthly,
      ...(plan.planPriceId ? { planPriceId: plan.planPriceId } : {}),
      ...(plan.priceVersion != null ? { priceVersion: plan.priceVersion } : {}),
    });
    setMessage(
      draftPreview
        ? "Agregado al carrito. El checkout rechazará cobros hasta publicar el plan."
        : "Plan agregado al carrito.",
    );
  }

  async function onWhatsApp() {
    const result = await buildWhatsAppMessage({
      intent: "contratar",
      planId: plan.id,
      planSlug: plan.slug,
      modality,
      priceLabel,
      city: cities.find((c) => c.id === form.cityCode)?.name,
      note: [
        form.companyName,
        modalityLabel(modality),
        priceLabel,
        form.solutionType === "COMPLETE" ? "POS completo" : "Solo software",
        `cajas:${form.cajaQty}`,
      ]
        .filter(Boolean)
        .join(" · "),
    });
    window.open(result.url, "_blank", "noopener,noreferrer");
  }

  async function onContinueCart() {
    const err = validateConsents();
    if (err) {
      setError(err);
      setStep(3);
      return;
    }
    onAddToCart();
    onClose();
    window.location.href = "/carrito";
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${draftPreview ? "Precio de referencia · " : ""}Contratar ${plan.name}`}
      className="w-[min(96vw,48rem)]"
      footer={
        <div className="flex flex-wrap gap-2">
          {step > 1 ? (
            <Button variant="outline" size="sm" onClick={() => setStep((s) => Math.max(1, s - 1))}>
              Atrás
            </Button>
          ) : null}
          {step < 3 ? (
            <Button
              size="sm"
              onClick={() => {
                const err = step === 1 ? validateStep1() : validateStep2();
                if (err) {
                  setError(err);
                  return;
                }
                setError(null);
                setStep((s) => s + 1);
              }}
            >
              Continuar
            </Button>
          ) : (
            <>
              <Button size="sm" disabled={submitting || !form.consentDataTreatment} onClick={() => void onContinueCart()}>
                Continuar
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={submitting || !form.consentDataTreatment}
                onClick={() => void onRequestAdvice()}
              >
                Solicitar asesoría
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={submitting}
                onClick={onAddToCart}
                title={
                  draftPreview
                    ? "Permitido en el flujo; el checkout rechaza precios no publicados"
                    : sellable
                      ? undefined
                      : "Plan no vendible aún"
                }
              >
                Agregar al carrito
              </Button>
              <Button size="sm" variant="ghost" disabled={submitting} onClick={() => void onWhatsApp()}>
                WhatsApp
              </Button>
            </>
          )}
          {preferWhatsApp && step === 3 ? (
            <Button size="sm" onClick={() => void onWhatsApp()}>
              Abrir WhatsApp
            </Button>
          ) : null}
        </div>
      }
    >
      {draftPreview ? (
        <p className="mb-3 rounded-md border border-[var(--yellow)]/40 bg-[color-mix(in_srgb,var(--yellow)_12%,white)] px-3 py-2 text-xs text-[var(--navy)]">
          Precio de referencia pendiente de publicación. El sistema rechaza cobros reales hasta publicar el plan y
          habilitar recaudos electrónicos certificados.
        </p>
      ) : null}

      <div className="mb-4 grid gap-2 rounded-lg border border-[var(--border)] bg-white/70 px-3 py-3 text-sm sm:grid-cols-3">
        <p>
          <span className="text-[var(--muted)]">Plan</span>
          <br />
          <span className="font-medium">{plan.name}</span>
        </p>
        <p>
          <span className="text-[var(--muted)]">Modalidad</span>
          <br />
          <span className="font-medium">{modalityLabel(modality)}</span>
        </p>
        <p>
          <span className="text-[var(--muted)]">Precio</span>
          <br />
          <span className="font-medium">{priceLabel}</span>
        </p>
        <p className="sm:col-span-3 text-xs text-[var(--muted)]">Identificador: {plan.id}</p>
      </div>

      {step === 1 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm sm:col-span-2">
            Nombre completo
            <input
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-white px-3 py-2"
              value={form.fullName}
              onChange={(e) => update("fullName", e.target.value)}
              autoComplete="name"
            />
          </label>
          <label className="block text-sm">
            Correo
            <input
              type="email"
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-white px-3 py-2"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              autoComplete="email"
            />
          </label>
          <label className="block text-sm">
            Teléfono
            <input
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-white px-3 py-2"
              value={form.phoneE164}
              onChange={(e) => update("phoneE164", e.target.value)}
              placeholder="+57…"
              autoComplete="tel"
            />
          </label>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm sm:col-span-2">
            Nombre del negocio
            <input
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-white px-3 py-2"
              value={form.companyName}
              onChange={(e) => update("companyName", e.target.value)}
            />
          </label>
          <label className="block text-sm">
            Tipo de negocio
            <select
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-white px-3 py-2"
              value={form.businessType}
              onChange={(e) => update("businessType", e.target.value)}
            >
              <option value="">Selecciona…</option>
              {BUSINESS_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            Solución
            <select
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-white px-3 py-2"
              value={form.solutionType}
              onChange={(e) => update("solutionType", e.target.value as "SOFTWARE" | "COMPLETE")}
            >
              <option value="SOFTWARE">Solo software</option>
              <option value="COMPLETE">POS completo</option>
            </select>
          </label>
          <label className="block text-sm">
            Departamento
            <select
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-white px-3 py-2"
              value={form.departmentCode}
              onChange={(e) => {
                update("departmentCode", e.target.value);
                update("cityCode", "");
              }}
            >
              <option value="">Selecciona…</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            Ciudad
            <select
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-white px-3 py-2"
              value={form.cityCode}
              onChange={(e) => update("cityCode", e.target.value)}
              disabled={!form.departmentCode}
            >
              <option value="">Selecciona…</option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            Cantidad de cajas
            <input
              type="number"
              min={1}
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-white px-3 py-2"
              value={form.cajaQty}
              onChange={(e) => update("cajaQty", Number(e.target.value) || 1)}
            />
          </label>
          <label className="block text-sm">
            Sucursales
            <input
              type="number"
              min={1}
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-white px-3 py-2"
              value={form.branchQty}
              onChange={(e) => update("branchQty", Number(e.target.value) || 1)}
            />
          </label>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-4">
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={form.consentDataTreatment}
              onChange={(e) => update("consentDataTreatment", e.target.checked)}
            />
            <span>
              Autorizo el tratamiento de mis datos personales conforme a la{" "}
              <Link href="/legal/tratamiento-de-datos" className="text-[var(--teal)] underline-offset-2 hover:underline">
                política de tratamiento de datos
              </Link>{" "}
              (obligatorio).
            </span>
          </label>
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={form.consentCommercial}
              onChange={(e) => update("consentCommercial", e.target.checked)}
            />
            <span>Acepto recibir información comercial y novedades de Camacho POS Colombia (opcional).</span>
          </label>
          <p className="text-xs text-[var(--muted)]">
            Resumen: {plan.name} · {modalityLabel(modality)} · {form.solutionType === "COMPLETE" ? "POS completo" : "Solo software"} ·{" "}
            {form.cajaQty} caja(s)
          </p>
        </div>
      ) : null}

      {error ? <p className="mt-3 text-sm text-[var(--danger)]">{error}</p> : null}
      {message ? <p className="mt-3 text-sm text-[var(--teal)]">{message}</p> : null}
      <p className="mt-4 text-xs text-[var(--muted)]">Paso {step} de 3</p>
    </Modal>
  );
}
