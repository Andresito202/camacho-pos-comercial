"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Button } from "@camacho-pos/ui";

type Faq = { id: string; question: string; answer: string };

const APPROVED_FALLBACK: Faq[] = [
  {
    id: "planes",
    question: "¿Qué planes hay?",
    answer:
      "Hay planes de software (mensual, anual y perpetuo según publicación) y opción de POS completo con equipos. Revisa /planes para precios en COP y estados reales de disponibilidad.",
  },
  {
    id: "prueba",
    question: "¿Qué es la prueba de 5 días?",
    answer:
      "Es un registro comercial CRM de evaluación por 5 días con condiciones visibles. Al vencer se bloquea el acceso de prueba y se invita a contratar. La activación de licencia POS en Windows/Android depende del aprovisionamiento Central en pos-platform.",
  },
  {
    id: "cobertura",
    question: "¿En qué ciudades atienden?",
    answer:
      "La cobertura comercial y tiempos de hardware se publican en /cobertura. Los lead times son orientativos y se confirman al contratar.",
  },
  {
    id: "equipos",
    question: "¿Venden equipos?",
    answer:
      "Sí. El catálogo de terminales, impresoras y periféricos está en /equipos. Puedes contratar solo software o kits completos.",
  },
];

function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function matchApproved(query: string, knowledge: Faq[]): Faq | null {
  const q = normalize(query);
  if (q.length < 3) return null;
  const tokens = q.split(/\s+/).filter((t) => t.length > 2);
  let best: { item: Faq; score: number } | null = null;
  for (const item of knowledge) {
    const hay = normalize(`${item.question} ${item.answer}`);
    let score = 0;
    for (const token of tokens) {
      if (hay.includes(token)) score += 1;
    }
    if (normalize(item.question).includes(q)) score += 3;
    if (!best || score > best.score) best = { item, score };
  }
  if (!best || best.score < 1) return null;
  return best.item;
}

export function CommercialAssistant({
  faq = [],
  whatsappNumber,
}: {
  faq?: Faq[];
  whatsappNumber?: string;
}) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; text: string }>>([
    {
      role: "assistant",
      text: "Soy el asistente comercial de Camacho POS Colombia. Solo respondo con información aprobada del portal (planes, equipos, cobertura, FAQ y prueba de 5 días). Si no está documentado, te indico contactar a un asesor.",
    },
  ]);

  const knowledge = useMemo(() => {
    const fromFaq = faq.map((item) => ({ id: item.id, question: item.question, answer: item.answer }));
    return [...fromFaq, ...APPROVED_FALLBACK];
  }, [faq]);

  const waHref = whatsappNumber
    ? `https://wa.me/${whatsappNumber.replace(/\D/g, "")}?text=${encodeURIComponent("Hola, necesito asesoría comercial de Camacho POS Colombia.")}`
    : "/contacto";

  function send() {
    const text = input.trim();
    if (!text) return;
    setInput("");
    const hit = matchApproved(text, knowledge);
    const reply = hit
      ? hit.answer
      : "No tengo una respuesta aprobada para esa consulta en el portal. Puedes revisar Preguntas frecuentes, Planes, Equipos o Cobertura, o escribir a un asesor por WhatsApp/Contacto. No invento precios ni promesas.";
    setMessages((prev) => [...prev, { role: "user", text }, { role: "assistant", text: reply }]);
  }

  return (
    <div className="fixed bottom-24 left-4 z-40 sm:bottom-6 sm:left-6">
      {open ? (
        <div className="mb-3 flex h-[min(70vh,28rem)] w-[min(94vw,22rem)] flex-col overflow-hidden rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]">
          <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] bg-[var(--navy)] px-3 py-2.5 text-white">
            <p className="text-sm font-bold">Asesor comercial</p>
            <button type="button" className="text-sm font-semibold text-white/80 hover:text-white" onClick={() => setOpen(false)}>
              Cerrar
            </button>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3 text-sm">
            {messages.map((msg, idx) => (
              <div
                key={`${msg.role}-${idx}`}
                className={
                  msg.role === "assistant"
                    ? "rounded-md bg-[var(--ivory)] px-3 py-2 text-[var(--navy)]"
                    : "ml-6 rounded-md bg-[var(--navy)] px-3 py-2 text-white"
                }
              >
                {msg.text}
              </div>
            ))}
          </div>
          <div className="border-t border-[var(--border)] p-3">
            <div className="mb-2 flex flex-wrap gap-2 text-xs">
              <Link href="/planes" className="rounded border border-[var(--border)] px-2 py-1 font-semibold hover:border-[var(--teal)]">
                Planes
              </Link>
              <Link href="/prueba-5-dias" className="rounded border border-[var(--border)] px-2 py-1 font-semibold hover:border-[var(--teal)]">
                Prueba 5 días
              </Link>
              <Link href="/preguntas-frecuentes" className="rounded border border-[var(--border)] px-2 py-1 font-semibold hover:border-[var(--teal)]">
                FAQ
              </Link>
              <a href={waHref} className="rounded border border-[var(--border)] px-2 py-1 font-semibold hover:border-[var(--teal)]" target="_blank" rel="noopener noreferrer">
                WhatsApp
              </a>
            </div>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
            >
              <input
                className="min-w-0 flex-1 rounded-md border border-[var(--border)] px-3 py-2 text-sm"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Pregunta sobre planes, equipos…"
                aria-label="Pregunta al asistente comercial"
              />
              <Button type="submit" size="sm">
                Enviar
              </Button>
            </form>
          </div>
        </div>
      ) : null}
      <Button
        type="button"
        className="shadow-[var(--shadow-soft)]"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {open ? "Ocultar asesor" : "Asesor comercial"}
      </Button>
    </div>
  );
}
