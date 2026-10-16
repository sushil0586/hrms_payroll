import { expect, type Locator, type Page } from "@playwright/test";

export async function expectAppShell(page: Page) {
  await expect(page.locator("main.shell:not(.app-loading-shell)").first()).toBeVisible();
}

export async function expectModernHeader(page: Page, heading: string | RegExp) {
  const levelOneHeading = page.getByRole("heading", { level: 1, name: heading });
  const anyHeading = page.getByRole("heading", { name: heading });
  const pageIntroTitle = page.locator(".page-intro__title").filter({ hasText: heading });
  await expect(levelOneHeading.or(anyHeading).or(pageIntroTitle).first()).toBeVisible();
}

export async function expectNoAppError(page: Page) {
  await expect(page.getByText(/application error|could not load the live|unhandled runtime error/i)).toHaveCount(0);
}

export async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const root = document.documentElement;
    const body = document.body;
    return Math.max(root.scrollWidth - root.clientWidth, body.scrollWidth - body.clientWidth);
  });

  expect(overflow).toBeLessThanOrEqual(1);
}

export async function expectSummaryMetric(scope: Locator, label: string | RegExp) {
  const summaryMetric = scope
    .locator(
      [
        ".attendance-summary-strip span",
        ".dashboard-summary-strip span",
        ".manager-summary-strip span",
        ".report-summary-strip span",
        ".report-insights-strip__metric",
        ".payroll-run-summary-strip span",
        ".payroll-setup-metrics span",
        ".metric-tile",
      ].join(", "),
    )
    .filter({ hasText: label })
    .first();

  await expect(summaryMetric.or(scope.getByText(label).filter({ visible: true }).first()).first()).toBeVisible();
}

export async function expectCompactMetric(scope: Page | Locator, label: string | RegExp) {
  const textMetric = scope.getByText(label).filter({ visible: true }).first();
  await expect(textMetric).toBeVisible();
}

function backendApiBaseUrl() {
  return process.env.HRMS_API_BASE_URL?.replace(/\/$/, "");
}

function backendPathFromProxyPath(path: string) {
  const backendPath = path.startsWith("/api/") ? path.slice("/api".length) : path;
  const [pathname, query = ""] = backendPath.split("?");
  const normalizedPathname = pathname.endsWith("/") ? pathname : `${pathname}/`;
  return query ? `${normalizedPathname}?${query}` : normalizedPathname;
}

export async function requestBackendPath(page: Page, path: string) {
  const apiBase = backendApiBaseUrl();
  if (!apiBase) {
    return page.request.get(path);
  }

  const token = (await page.context().cookies()).find((cookie) => cookie.name === "hrms_access_token")?.value;
  expect(token, "Expected authenticated browser session token.").toBeTruthy();
  return page.request.get(`${apiBase}${backendPathFromProxyPath(path)}`, {
    headers: { Authorization: `Token ${token}` },
  });
}

export async function fetchBrowserPath(page: Page, path: string) {
  return page.evaluate(async (requestPath) => {
    const response = await fetch(requestPath, { credentials: "include" });
    return {
      body: await response.text(),
      headers: Object.fromEntries(response.headers.entries()),
      status: response.status,
    };
  }, path);
}

export async function suppressBrowserTestNoise(page: Page) {
  try {
    await page.addStyleTag({
      content: `
        nextjs-portal,
        [data-nextjs-dialog-overlay],
        [data-nextjs-toast],
        [data-nextjs-build-indicator],
        [aria-label="Next.js logo"] {
          display: none !important;
          visibility: hidden !important;
        }
      `,
    });
  } catch (error) {
    if (!String(error).includes("Execution context was destroyed")) {
      throw error;
    }
  }
}

export async function expectPageReady(page: Page, heading: string | RegExp) {
  await suppressBrowserTestNoise(page);
  await expectAppShell(page);
  await expectModernHeader(page, heading);
  await expectNoAppError(page);
  await expectNoHorizontalOverflow(page);
}
