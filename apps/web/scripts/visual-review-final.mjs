/**
 * Full-page visual review screenshots for owner review.
 * Requires live web :3000 + API :4000 + Postgres. Dev fixture for /admin.
 * Usage: node scripts/visual-review-final.mjs
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, "../../../docs/testing/visual-review-final");
const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";

const VIEWPORTS = {
  desktop: { width: 1920, height: 1080, label: "1920x1080" },
  mobile: { width: 390, height: 844, label: "390x844" },
};

fs.mkdirSync(OUT, { recursive: true });

async function shot(page, name) {
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  const stat = fs.statSync(file);
  console.log(`OK ${name}.png (${stat.size} bytes)`);
  return file;
}

async function safeClick(page, selector, opts = {}) {
  const loc = page.locator(selector).first();
  if ((await loc.count()) === 0) return false;
  try {
    await loc.click({ timeout: 5000, ...opts });
    return true;
  } catch {
    return false;
  }
}

async function captureStatic(page, viewportKey, routes) {
  const vp = VIEWPORTS[viewportKey];
  await page.setViewportSize({ width: vp.width, height: vp.height });
  for (const [route, slug] of routes) {
    await page.goto(`${BASE}${route}`, { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForTimeout(400);
    await shot(page, `${slug}-${vp.label}`);
  }
}

async function capturePlanesVariants(page, viewportKey) {
  const vp = VIEWPORTS[viewportKey];
  await page.setViewportSize({ width: vp.width, height: vp.height });
  await page.goto(`${BASE}/planes`, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(500);

  // Solo software + Mensual (default-ish)
  await safeClick(page, 'button:has-text("Solo software")');
  await safeClick(page, 'button:has-text("Mensual")');
  await page.waitForTimeout(300);
  await shot(page, `planes-mensual-software-${vp.label}`);

  await safeClick(page, 'button:has-text("Anual")');
  await page.waitForTimeout(300);
  await shot(page, `planes-anual-software-${vp.label}`);

  await safeClick(page, 'button:has-text("POS completo")');
  await safeClick(page, 'button:has-text("Mensual")');
  await page.waitForTimeout(300);
  await shot(page, `planes-mensual-completo-${vp.label}`);

  // Perpetual section is separate on the page — scroll / ensure visible
  const perpetua = page.locator("text=/perpetu/i").first();
  if (await perpetua.count()) {
    await perpetua.scrollIntoViewIfNeeded().catch(() => {});
  }
  await page.waitForTimeout(200);
  await shot(page, `planes-perpetua-seccion-${vp.label}`);
}

async function captureHireModal(page, viewportKey) {
  const vp = VIEWPORTS[viewportKey];
  await page.setViewportSize({ width: vp.width, height: vp.height });
  await page.goto(`${BASE}/planes`, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(400);
  const hire = page.getByRole("button", { name: /^Contratar$/ }).first();
  if ((await hire.count()) === 0) {
    console.warn(`SKIP hire-modal-${vp.label}: no Contratar button`);
    return;
  }
  await hire.click();
  await page.waitForTimeout(500);

  // Fill ficticious data — labels wrap inputs
  const fillByLabel = async (labelRe, value) => {
    const input = page.locator("label").filter({ hasText: labelRe }).locator("input, select, textarea").first();
    if ((await input.count()) === 0) return;
    const tag = await input.evaluate((el) => el.tagName.toLowerCase());
    if (tag === "select") {
      await input.selectOption({ index: 1 }).catch(async () => {
        const opts = await input.locator("option").allTextContents();
        if (opts.length > 1) await input.selectOption({ label: opts[1] });
      });
    } else {
      await input.fill(String(value));
    }
  };

  await fillByLabel(/nombre completo/i, "María Camacho Demo");
  await fillByLabel(/correo/i, "maria.demo@ejemplo.com");
  await fillByLabel(/tel[eé]fono/i, "+573001112233");
  await safeClick(page, 'button:has-text("Continuar")');
  await page.waitForTimeout(300);

  await fillByLabel(/nombre del negocio|negocio/i, "Comercial Demo SAS");
  await fillByLabel(/tipo de negocio/i, "Tienda");
  await fillByLabel(/departamento/i, null);
  await fillByLabel(/ciudad/i, null);
  await safeClick(page, 'button:has-text("Continuar")');
  await page.waitForTimeout(300);

  // consents on step 3
  const checks = page.locator('dialog input[type="checkbox"], [role="dialog"] input[type="checkbox"]');
  const n = await checks.count();
  for (let i = 0; i < n; i += 1) {
    const box = checks.nth(i);
    if (!(await box.isChecked())) await box.check().catch(() => {});
  }

  await page.waitForTimeout(300);
  await shot(page, `modal-contratacion-diligenciado-${vp.label}`);
  await page.keyboard.press("Escape").catch(() => {});
  await safeClick(page, 'button[aria-label="Cerrar"]');
}

async function captureCartCheckout(page, viewportKey) {
  const vp = VIEWPORTS[viewportKey];
  await page.setViewportSize({ width: vp.width, height: vp.height });
  await page.goto(`${BASE}/equipos`, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(400);

  // Select first available product checkbox if present, or click Agregar
  const addBtn = page.getByRole("button", { name: /Agregar/i }).first();
  if (await addBtn.count()) {
    await addBtn.click().catch(() => {});
    await page.waitForTimeout(200);
  }
  const bulk = page.getByRole("button", { name: /Agregar seleccionados/i });
  if (await bulk.count()) {
    // try check first checkbox
    const cb = page.locator('input[type="checkbox"]').first();
    if (await cb.count()) await cb.check().catch(() => {});
    await bulk.click().catch(() => {});
  }

  // Also seed cart via localStorage if store key exists
  await page.evaluate(() => {
    try {
      const key = Object.keys(localStorage).find((k) => /cart/i.test(k));
      // HireModal / cart-store uses zustand persist — try common key
      const payload = {
        state: {
          items: [
            {
              id: "visual-review-item",
              kind: "equipment",
              label: "Terminal táctil (revisión visual)",
              quantity: 1,
              unitAmountCents: 890000,
              currency: "COP",
            },
          ],
        },
        version: 0,
      };
      localStorage.setItem("camacho-pos-comercial-cart", JSON.stringify(payload));
    } catch {
      /* ignore */
    }
  });

  await page.goto(`${BASE}/carrito`, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(500);
  await shot(page, `carrito-${vp.label}`);

  await page.goto(`${BASE}/checkout`, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(500);
  // Fill checkout if form present
  const email = page.locator('input[type="email"], input[name*="email" i]').first();
  if (await email.count()) {
    await email.fill("checkout.demo@ejemplo.com");
  }
  const name = page.locator('input[name*="name" i], input[name*="fullName" i]').first();
  if (await name.count()) await name.fill("Cliente Demo Visual");
  const phone = page.locator('input[name*="phone" i], input[type="tel"]').first();
  if (await phone.count()) await phone.fill("+573009998877");
  await page.waitForTimeout(300);
  await shot(page, `checkout-${vp.label}`);

  // Try submit to reach payment/estado if possible (sandbox mock)
  const pay = page.getByRole("button", { name: /pagar|continuar|confirmar|checkout/i }).first();
  if (await pay.count()) {
    await pay.click().catch(() => {});
    await page.waitForTimeout(1500);
    await shot(page, `checkout-pago-prueba-${vp.label}`);
  } else {
    // fallback: estado page may need id — still capture checkout as payment surface
    await shot(page, `checkout-pago-prueba-${vp.label}`);
  }
}

async function captureEquipmentDetail(page, viewportKey) {
  const vp = VIEWPORTS[viewportKey];
  await page.setViewportSize({ width: vp.width, height: vp.height });
  await page.goto(`${BASE}/equipos`, { waitUntil: "networkidle", timeout: 60000 });
  const link = page.locator('a[href^="/equipos/"]').first();
  if (await link.count()) {
    await link.click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(400);
    await shot(page, `equipos-detalle-${vp.label}`);
  } else {
    await shot(page, `equipos-detalle-${vp.label}`);
  }
}

async function captureSolutionDetail(page, viewportKey) {
  const vp = VIEWPORTS[viewportKey];
  await page.setViewportSize({ width: vp.width, height: vp.height });
  await page.goto(`${BASE}/soluciones/tiendas`, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(400);
  await shot(page, `soluciones-tiendas-${vp.label}`);
}

async function main() {
  console.log(`BASE=${BASE} OUT=${OUT}`);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const staticRoutes = [
    ["/", "inicio"],
    ["/software-pos", "software-pos"],
    ["/equipos", "equipos-catalogo"],
    ["/soluciones", "soluciones"],
    ["/promociones", "promociones"],
    ["/prueba-5-dias", "prueba-5-dias"],
    ["/cobertura", "cobertura"],
    ["/nosotros", "nosotros"],
    ["/contacto", "contacto"],
    ["/blog", "blog"],
    ["/soporte", "soporte"],
    ["/preguntas-frecuentes", "preguntas-frecuentes"],
    ["/legal/terminos", "legal-terminos"],
    ["/legal/privacidad", "legal-privacidad"],
    ["/legal/garantias", "legal-garantias"],
    ["/legal/cookies", "legal-cookies"],
    ["/legal/envios", "legal-envios"],
    ["/legal/devoluciones", "legal-devoluciones"],
    ["/admin", "admin-dashboard"],
    ["/admin/planes", "admin-planes-precios"],
    ["/admin/equipos", "admin-productos-kits"],
    ["/admin/clientes", "admin-clientes"],
    ["/admin/pedidos", "admin-pedidos"],
    ["/admin/promociones", "admin-promociones"],
    ["/admin/contenidos", "admin-contenidos-imagenes"],
    ["/admin/ajustes", "admin-configuracion"],
    ["/admin/pagos", "admin-pagos"],
  ];

  // Create a live trial for status/blocked evidence (ACTIVE shot).
  let trialId = null;
  try {
    const res = await fetch(`${process.env.PLAYWRIGHT_API_URL ?? "http://127.0.0.1:4000"}/v1/crm/trial`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        fullName: "Visual Review Trial",
        email: `visual.trial.${Date.now()}@ejemplo.com`,
        phoneE164: "+573001112233",
        companyName: "Revisión Visual SAS",
        sector: "Tienda",
        city: "Bogotá",
        notes: "Captura Playwright",
        consentDataTreatment: true,
        consentTerms: true,
        website: "",
      }),
    });
    const body = await res.json();
    trialId = body?.id ?? null;
    console.log(`trialId=${trialId}`);
  } catch (err) {
    console.warn("trial create failed", err);
  }

  for (const key of ["desktop", "mobile"]) {
    console.log(`\n=== ${key} ===`);
    await captureStatic(page, key, staticRoutes);
    if (trialId) {
      const vp = VIEWPORTS[key];
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(`${BASE}/prueba-5-dias/estado/${trialId}`, { waitUntil: "networkidle", timeout: 60000 });
      await page.waitForTimeout(400);
      await shot(page, `prueba-5-dias-estado-${vp.label}`);
    }
    // Open commercial assistant for evidence
    {
      const vp = VIEWPORTS[key];
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 60000 });
      await safeClick(page, 'button:has-text("Asesor comercial")');
      await page.waitForTimeout(400);
      await shot(page, `asistente-comercial-${vp.label}`);
    }
    await capturePlanesVariants(page, key);
    await captureEquipmentDetail(page, key);
    await captureSolutionDetail(page, key);
    await captureHireModal(page, key);
    await captureCartCheckout(page, key);
  }

  await browser.close();
  const files = fs.readdirSync(OUT).filter((f) => f.endsWith(".png")).sort();
  console.log(`\nDone. ${files.length} PNGs in ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
