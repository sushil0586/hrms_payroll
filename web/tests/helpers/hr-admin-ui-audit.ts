import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

import { expect, type Locator, type Page } from "@playwright/test";

import { expectNoAppError, expectNoHorizontalOverflow, suppressBrowserTestNoise } from "./assertions";

const hrAdminRoot = path.join(process.cwd(), "src/app/hr-admin");
const playwrightBaseUrl = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${process.env.PLAYWRIGHT_PORT ?? 3100}`;
const hrAdminUsername = process.env.PLAYWRIGHT_LIVE_HR_ADMIN_USERNAME ?? "nisha.rao";
const seedPassword = process.env.PLAYWRIGHT_LIVE_SEED_PASSWORD ?? "Password@123";
const authenticatedPages = new WeakSet<Page>();

export function discoverHrAdminRoutes(directory = hrAdminRoot, includeDynamic = false): string[] {
  if (!existsSync(directory)) {
    return [];
  }

  const routes: string[] = [];
  for (const entry of readdirSync(directory).sort()) {
    const entryPath = path.join(directory, entry);
    if (statSync(entryPath).isDirectory()) {
      routes.push(...discoverHrAdminRoutes(entryPath, includeDynamic));
      continue;
    }
    if (entry !== "page.tsx") {
      continue;
    }

    const route = `/hr-admin/${path.relative(hrAdminRoot, path.dirname(entryPath)).replaceAll(path.sep, "/")}`
      .replace(/\/$/, "")
      .replace("/.", "");
    const normalizedRoute = route === "/hr-admin" ? route : route.replace(/\/page$/, "");
    if (includeDynamic || (!normalizedRoute.includes("[") && !normalizedRoute.includes("]"))) {
      routes.push(normalizedRoute);
    }
  }

  return [...new Set(routes)].sort((first, second) => first.localeCompare(second));
}

export function chunks<T>(items: T[], size: number): T[][] {
  const grouped: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    grouped.push(items.slice(index, index + size));
  }
  return grouped;
}

export async function gotoDemoHrAdmin(page: Page, route: string) {
  if (!authenticatedPages.has(page)) {
    const response = await page.request.post("/api/auth/login", {
      data: {
        identifier: hrAdminUsername,
        password: seedPassword,
      },
    }).catch(() => null);

    if (!response?.ok()) {
      await page.context().addCookies([
        {
          name: "hrms_access_token",
          value: "playwright-demo-token",
          url: playwrightBaseUrl,
        },
      ]);
    }
    authenticatedPages.add(page);
  }
  await page.goto(route, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
}

async function expectControlBoxHealthy(control: Locator, route: string) {
  const box = await control.boundingBox();
  if (!box) {
    return;
  }

  const controlKind = await control.evaluate((element) => ({
    isInlineTextLink: element.tagName === "A" && !element.classList.contains("button"),
    isNativeChoiceInput: element.tagName === "INPUT" && ["checkbox", "radio"].includes((element as HTMLInputElement).type),
  }));
  const minimumWidth = controlKind.isInlineTextLink ? 12 : controlKind.isNativeChoiceInput ? 16 : 24;
  const minimumHeight = controlKind.isInlineTextLink ? 14 : controlKind.isNativeChoiceInput ? 16 : 24;
  expect(box.width, `${route} control should have visible width`).toBeGreaterThanOrEqual(minimumWidth);
  expect(box.height, `${route} control should have visible height`).toBeGreaterThanOrEqual(minimumHeight);

  const viewport = control.page().viewportSize();
  if (viewport) {
    expect(box.x, `${route} control should not start outside the viewport`).toBeGreaterThanOrEqual(-2);
    expect(box.x + box.width, `${route} control should not be clipped past the viewport`).toBeLessThanOrEqual(viewport.width + 2);
  }

  const isButtonLike = await control.evaluate((element) => element.classList.contains("button") || element.tagName === "BUTTON");
  if (isButtonLike) {
    const hasTextClipping = await control.evaluate((element) => element.scrollWidth > element.clientWidth + 2);
    expect(hasTextClipping, `${route} button text should not be clipped`).toBe(false);
  }
}

export async function auditVisibleControls(page: Page, route: string, limit = 24) {
  const controls = page.locator("main a, main button, main summary, header a, header button, aside a, aside button");
  const count = await controls.count();

  for (let index = 0; index < Math.min(count, limit); index += 1) {
    const control = controls.nth(index);
    if (!(await control.isVisible().catch(() => false))) {
      continue;
    }
    await control.scrollIntoViewIfNeeded().catch(() => undefined);
    await expectControlBoxHealthy(control, route);
    await control.hover({ timeout: 1_000 }).catch(() => undefined);
    await expectNoHorizontalOverflow(page);
  }
}

async function auditDisclosureControls(page: Page, route: string) {
  const summaries = page.locator("main summary");
  const count = await summaries.count();

  for (let index = 0; index < Math.min(count, 8); index += 1) {
    const summary = summaries.nth(index);
    if (!(await summary.isVisible().catch(() => false))) {
      continue;
    }
    await summary.scrollIntoViewIfNeeded().catch(() => undefined);
    await summary.click();
    await expectNoHorizontalOverflow(page);
    await expectVisibleLinksAreReal(page, route);
    await summary.click();
  }
}

export async function expectVisibleLinksAreReal(page: Page, route: string) {
  const badHrefs = await page.locator("a[href]").evaluateAll((links) =>
    links
      .filter((link) => {
        const rect = link.getBoundingClientRect();
        const style = window.getComputedStyle(link);
        return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
      })
      .map((link) => link.getAttribute("href") ?? "")
      .filter((href) => href === "#" || href.includes("[") || href.includes("undefined") || href.includes("null")),
  );

  expect(badHrefs, `${route} should not expose placeholder hrefs`).toEqual([]);
}

export async function auditHrAdminRoute(page: Page, route: string) {
  await gotoDemoHrAdmin(page, route);
  await suppressBrowserTestNoise(page);

  const pathname = route.split("?")[0];
  await expect(page.locator("main.shell:not(.app-loading-shell)").first(), `${route} should render the app shell`).toBeVisible();
  await expect(page.locator("h1").first(), `${route} should expose a page heading`).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`${pathname.replaceAll("/", "\\/")}(\\?|$)`));
  await expectNoAppError(page);
  await expectNoHorizontalOverflow(page);
  await auditVisibleControls(page, route);
  await auditDisclosureControls(page, route);
  await expectVisibleLinksAreReal(page, route);
}
