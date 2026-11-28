import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import { join } from 'path';

const base = process.env.BASE_URL || 'http://127.0.0.1:3000';
const out = 'docs/testing/screenshots';
mkdirSync(out, { recursive: true });

const viewports = [
  { name: '1920x1080', width: 1920, height: 1080 },
  { name: '1440x900', width: 1440, height: 900 },
  { name: '1366x768', width: 1366, height: 768 },
  { name: '768x1024', width: 768, height: 1024 },
  { name: '390x844', width: 390, height: 844 },
  { name: '360x800', width: 360, height: 800 },
];

const pages = [
  { path: '/', slug: 'inicio' },
  { path: '/planes', slug: 'planes' },
  { path: '/equipos', slug: 'equipos' },
  { path: '/promociones', slug: 'promociones' },
  { path: '/soporte', slug: 'soporte' },
  { path: '/contacto', slug: 'contacto' },
  { path: '/carrito', slug: 'carrito' },
  { path: '/checkout', slug: 'checkout' },
  { path: '/admin', slug: 'admin' },
  { path: '/software-pos', slug: 'software-pos' },
  { path: '/cobertura', slug: 'cobertura' },
  { path: '/soluciones/tiendas', slug: 'soluciones-tiendas' },
];

const browser = await chromium.launch({ headless: true });
const results = [];
for (const vp of viewports) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  for (const p of pages) {
    const url = base + p.path;
    try {
      const res = await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
      const status = res?.status() ?? 0;
      const file = `${p.slug}-${vp.name}.png`;
      await page.screenshot({ path: join(out, file), fullPage: true });
      results.push({ url, vp: vp.name, status, file, ok: status >= 200 && status < 400 });
      console.log(`OK ${status} ${file}`);
    } catch (e) {
      results.push({ url, vp: vp.name, error: String(e), ok: false });
      console.error(`FAIL ${url} ${vp.name}: ${e}`);
    }
  }
  await context.close();
}
await browser.close();
console.log(JSON.stringify({ captured: results.filter(r=>r.ok).length, failed: results.filter(r=>!r.ok).length }, null, 2));
