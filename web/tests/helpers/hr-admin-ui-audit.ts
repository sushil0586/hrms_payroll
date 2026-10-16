import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

import { expect, type Page } from "@playwright/test";

import { expectNoAppError, expectNoHorizontalOverflow, suppressBrowserTestNoise } from "./assertions";

const hrAdminRoot = path.join(process.cwd(), "src/app/hr-admin");
const playwrightBaseUrl = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${process.env.PLAYWRIGHT_PORT ?? 3100}`;
const hrAdminUsername = process.env.PLAYWRIGHT_LIVE_HR_ADMIN_USERNAME ?? "nisha.rao";
const hrAdminPassword = process.env.PLAYWRIGHT_LIVE_HR_ADMIN_PASSWORD ?? process.env.PLAYWRIGHT_LIVE_SEED_PASSWORD ?? "Password@123";
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
        password: hrAdminPassword,
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
}

export async function auditVisibleControls(page: Page, route: string, limit = 24) {
  const controls = page.locator("main a, main button, main summary, header a, header button, aside a, aside button");
  const controlStates = await controls.evaluateAll((elements, maximum) =>
    elements.slice(0, maximum).flatMap((element, index) => {
      const style = window.getComputedStyle(element);
      let rect = element.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0 || style.visibility === "hidden" || style.display === "none") {
        return [];
      }
      element.scrollIntoView({ block: "nearest", inline: "nearest" });
      rect = element.getBoundingClientRect();
      const isInlineTextLink = element.tagName === "A" && !element.classList.contains("button");
      const isNativeChoiceInput = element.tagName === "INPUT" && ["checkbox", "radio"].includes((element as HTMLInputElement).type);
      return [{
        index,
        label: (element.getAttribute("aria-label") || element.textContent || element.tagName).trim().replace(/\s+/g, " ").slice(0, 120),
        box: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        minimumWidth: isInlineTextLink ? 12 : isNativeChoiceInput ? 16 : 24,
        minimumHeight: isInlineTextLink ? 14 : isNativeChoiceInput ? 16 : 24,
        isButtonLike: element.classList.contains("button") || element.tagName === "BUTTON",
        hasTextClipping: element.scrollWidth > element.clientWidth + 2,
        horizontalOverflow: Math.max(
          document.documentElement.scrollWidth - document.documentElement.clientWidth,
          document.body.scrollWidth - document.body.clientWidth,
        ),
      }];
    }), limit);
  const viewport = page.viewportSize();

  for (const controlState of controlStates) {
    const { box } = controlState;
    expect(box.width, `${route} control should have visible width`).toBeGreaterThanOrEqual(controlState.minimumWidth);
    expect(box.height, `${route} control should have visible height`).toBeGreaterThanOrEqual(controlState.minimumHeight);
    if (viewport) {
      expect(box.x, `${route} control "${controlState.label}" should not start outside the viewport`).toBeGreaterThanOrEqual(-2);
      expect(box.x + box.width, `${route} control "${controlState.label}" should not be clipped past the viewport`).toBeLessThanOrEqual(viewport.width + 2);
    }
    if (controlState.isButtonLike) {
      expect(controlState.hasTextClipping, `${route} button text should not be clipped`).toBe(false);
    }
    expect(controlState.horizontalOverflow, `${route} should not overflow after revealing "${controlState.label}"`).toBeLessThanOrEqual(1);
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
    await summary.evaluate((element) => {
      element.scrollIntoView({ behavior: "instant", block: "nearest", inline: "nearest" });
      (element as HTMLElement).click();
    });
    await expectNoHorizontalOverflow(page);
    await expectVisibleLinksAreReal(page, route);
    await summary.evaluate((element) => (element as HTMLElement).click());
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
