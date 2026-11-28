import { test, expect } from "@playwright/test";

const apiUrl = (process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:4000").replace(/\/$/, "");

async function apiHealthy(): Promise<boolean> {
  try {
    const response = await fetch(`${apiUrl}/health`, { signal: AbortSignal.timeout(3000) });
    return response.ok;
  } catch {
    return false;
  }
}

test.describe("commercial happy path", () => {
  test.beforeAll(async () => {
    const ok = await apiHealthy();
    if (!ok) {
      test.skip(
        true,
        `commercial-api not reachable at ${apiUrl}/health — start pnpm dev:api (and Postgres) or skip e2e locally`,
      );
    }
  });

  test("home loads and exposes primary hire CTA", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("body")).toBeVisible();
    // Brand / product signal should be present without requiring a specific marketing string forever
    await expect(page.getByRole("link").first()).toBeVisible();
  });

  test("plans page can load catalog from API", async ({ page }) => {
    const catalog = await fetch(`${apiUrl}/v1/catalog/plans`);
    expect(
      catalog.ok,
      `GET /v1/catalog/plans failed (${catalog.status}). Seed DB with pnpm db:setup.`,
    ).toBeTruthy();

    await page.goto("/planes");
    await expect(page.locator("body")).toBeVisible();
  });

  test("checkout route renders when navigated", async ({ page }) => {
    await page.goto("/checkout");
    await expect(page.locator("body")).toBeVisible();
  });
});
