import { expect, type Locator, type Page, test } from "@playwright/test";

import { expectNoAppError, expectNoHorizontalOverflow, suppressBrowserTestNoise } from "../helpers/assertions";

type PayrollRouteExpectation = {
  path: string;
  heading: string;
  currentStep: string;
  selectors: string[];
  visibleText: Array<string | RegExp>;
  controls?: Array<string | RegExp>;
};

const payrollRoutes: PayrollRouteExpectation[] = [
  {
    path: "/hr-admin/payroll-readiness",
    heading: "Payroll Readiness",
    currentStep: "Readiness",
    selectors: [".payroll-cycle-journey", ".payroll-readiness-tabs", ".payroll-readiness-summary-grid"],
    visibleText: ["Current decision", "What to do next", "Summary", "Issues", "Employees", "Setup Health", "Evidence"],
  },
  {
    path: "/hr-admin/payroll-inputs",
    heading: "Payroll Inputs",
    currentStep: "Inputs",
    selectors: [".payroll-cycle-journey", ".payroll-input-workspace", ".payroll-input-table"],
    visibleText: ["Employee snapshots", "Run guardrails", "Snapshot trace"],
    controls: ["Input operations", /Input lock|Lock selected run inputs|Requires payroll\.lock|Select a payroll run/i],
  },
  {
    path: "/hr-admin/payroll-calculations",
    heading: "Payroll Calculations",
    currentStep: "Calculation",
    selectors: [".payroll-cycle-journey", ".payroll-calc-workspace", ".payroll-calc-line-table"],
    visibleText: ["Calculation attempts", "Calculation validation", "Line trace"],
    controls: ["Calculation controls", /Calculate draft|Open review|Requires payroll/i],
  },
  {
    path: "/hr-admin/payroll-review",
    heading: "Payroll Review",
    currentStep: "Review",
    selectors: [".payroll-cycle-journey", ".payroll-review-workspace", ".payroll-review-exception-table"],
    visibleText: ["Review state", "Exception register", "Approval trail"],
    controls: ["Review controls", /Submit review|Approve review|Final lock|Generate outputs|Requires payroll/i],
  },
  {
    path: "/hr-admin/payroll-outputs",
    heading: "Payroll Outputs",
    currentStep: "Outputs",
    selectors: [".payroll-cycle-journey", ".payroll-output-workspace"],
    visibleText: ["Output batches", "Artifact register", "Handoff readiness"],
    controls: ["Output controls", /Publish outputs|Generate finance handoff|Requires payroll/i],
  },
  {
    path: "/hr-admin/payroll-handoff",
    heading: "Payroll Handoff",
    currentStep: "Handoff",
    selectors: [".payroll-cycle-journey", ".compliance-evidence-strip"],
    visibleText: ["Finance handoff", /Provider|Delivery|Evidence|Handoff/i],
    controls: ["Handoff controls", /Transmit|Acknowledge|Audit pack|Requires payroll/i],
  },
];

const payrollStepLinks = [
  { label: "Readiness", href: "/hr-admin/payroll-readiness" },
  { label: "Inputs", href: "/hr-admin/payroll-inputs" },
  { label: "Calculation", href: "/hr-admin/payroll-calculations" },
  { label: "Review", href: "/hr-admin/payroll-review" },
  { label: "Outputs", href: "/hr-admin/payroll-outputs" },
  { label: "Handoff", href: "/hr-admin/payroll-handoff" },
];

async function gotoDemoHrAdmin(page: Page, path: string) {
  const response = await page.request.post("/api/auth/login", {
    data: {
      identifier: process.env.PLAYWRIGHT_LIVE_HR_ADMIN_USERNAME ?? "nisha.rao",
      password: process.env.PLAYWRIGHT_LIVE_SEED_PASSWORD ?? "Password@123",
    },
  }).catch(() => null);

  if (!response?.ok()) {
    await page.context().addCookies([
      {
        name: "hrms_access_token",
        value: "playwright-demo-token",
        url: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3100",
      },
    ]);
  }
  await page.goto(path, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
  await suppressBrowserTestNoise(page);
}

async function expectPayrollRoute(page: Page, route: PayrollRouteExpectation) {
  await gotoDemoHrAdmin(page, route.path);
  await expect(page.locator("main.shell:not(.app-loading-shell)").first()).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: route.heading })).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`${route.path.replaceAll("/", "\\/")}(\\?|$)`));

  const journey = page.getByRole("region", { name: "Payroll cycle journey" });
  await expect(journey).toBeVisible();
  for (const step of payrollStepLinks) {
    await expect(journey.locator(".payroll-cycle-step").filter({ hasText: step.label })).toHaveAttribute("href", step.href);
  }
  await expect(journey.locator(".payroll-cycle-step").filter({ hasText: route.currentStep })).toHaveAttribute("aria-current", "page");

  for (const selector of route.selectors) {
    await expect(page.locator(selector).first(), `${route.path} should render ${selector}`).toBeVisible();
  }
  for (const text of route.visibleText) {
    await expect(page.locator("main").getByText(text).filter({ visible: true }).first(), `${route.path} should show ${String(text)}`).toBeVisible();
  }
  for (const text of route.controls ?? []) {
    await expect(
      page.locator("main").getByText(text).filter({ visible: true }).first(),
      `${route.path} should show control text ${String(text)}`,
    ).toBeVisible();
  }

  await expectNoAppError(page);
  await expectNoHorizontalOverflow(page);
  await expectPayrollTypographyContract(page, route);
}

async function expectRightAlignedWithin(container: Locator, target: Locator, label: string, tolerance = 28) {
  const containerBox = await container.boundingBox();
  const targetBox = await target.boundingBox();
  expect(containerBox, `${label} container should be measurable`).not.toBeNull();
  expect(targetBox, `${label} target should be measurable`).not.toBeNull();
  expect((targetBox?.x ?? 0) + (targetBox?.width ?? 0), `${label} should align to the right edge`).toBeGreaterThanOrEqual(
    (containerBox?.x ?? 0) + (containerBox?.width ?? 0) - tolerance,
  );
}

async function expectPayrollTypographyContract(page: Page, route: PayrollRouteExpectation) {
  const main = page.locator("main.shell:not(.app-loading-shell)").first();
  const title = page.getByRole("heading", { level: 1, name: route.heading });
  const titleFontSize = await title.evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize));
  expect(titleFontSize, `${route.path} page title should stay compact`).toBeLessThanOrEqual(24);

  await expect(page.locator(".payroll-cycle-journey__next"), `${route.path} should not show duplicate next-action panel`).toBeHidden();
  await expect(main.locator(".payroll-cycle-journey__steps"), `${route.path} should show compact step navigation`).toBeVisible();

  const viewport = page.viewportSize();
  if ((viewport?.width ?? 0) >= 960) {
    await expectRightAlignedWithin(
      main.locator(".page-intro").first(),
      main.locator(".page-intro__actions").first(),
      `${route.path} page-level action group`,
      36,
    );
  }

  const overflowingElements = await page.evaluate(() => {
    const root = document.querySelector<HTMLElement>("main.shell:not(.app-loading-shell)");
    if (!root) {
      return ["missing payroll shell"];
    }
    const selectors = [
      ".payroll-cycle-step",
      ".metric-tile-soft",
      ".payroll-setup-mini-card",
      ".payroll-setup-mini-card strong",
      ".payroll-setup-panel__header",
      ".payroll-input-run-card__counts span",
    ];

    return Array.from(root.querySelectorAll<HTMLElement>(selectors.join(",")))
      .filter((element) => {
        const style = getComputedStyle(element);
        if (style.display === "none" || style.visibility === "hidden") {
          return false;
        }
        const rect = element.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
          return false;
        }
        return element.scrollWidth - element.clientWidth > 3;
      })
      .slice(0, 8)
      .map((element) => {
        const label = element.textContent?.trim().replace(/\s+/g, " ").slice(0, 80) || element.tagName;
        return `${element.className || element.tagName}: ${label}`;
      });
  });
  expect(overflowingElements, `${route.path} payroll typography should avoid clipped cards and chips`).toEqual([]);
}

test.describe("HR Admin payroll cycle phase 11 certification", () => {
  test("certifies payroll readiness tab navigation and preserved employee review", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 960 });
    await gotoDemoHrAdmin(page, "/hr-admin/payroll-readiness");

    await expect(page.locator(".payroll-readiness-summary-grid")).toBeVisible();
    await expect(page.locator(".shell--payroll-readiness .payroll-cycle-journey__next")).toBeHidden();
    await expect(page.locator("main").getByText("Current decision")).toBeVisible();
    await expect(page.getByRole("link", { name: "Fix blockers" })).toHaveAttribute("href", /tab=issues/);
    await expect(page.getByRole("link", { name: "Fix blockers" })).toHaveAttribute("href", /status=blocked/);
    await expect(page.getByRole("link", { name: "Check setup health" })).toHaveAttribute("href", /tab=setup/);
    await expectRightAlignedWithin(
      page.locator(".payroll-readiness-status-card").first(),
      page.locator(".payroll-readiness-action-row").first(),
      "summary action row",
    );

    await page.locator(".payroll-readiness-tab", { hasText: "Issues" }).click();
    await expect(page).toHaveURL(/\/hr-admin\/payroll-readiness\?tab=issues/);
    await expect(page.locator(".payroll-readiness-issue-grid")).toBeVisible();
    await expect(page.getByRole("link", { name: "Open blocked employees" })).toHaveAttribute("href", /tab=employees/);
    await expect(page.getByRole("link", { name: "Open blocked employees" })).toHaveAttribute("href", /status=blocked/);
    await expect(page.locator(".payroll-readiness-issue-card .button").first()).toHaveAttribute("href", /^\/hr-admin\//);
    await expectRightAlignedWithin(
      page.locator(".payroll-readiness-issue-card").first(),
      page.locator(".payroll-readiness-issue-card .button").first(),
      "issue-card action",
    );

    await page.locator(".payroll-readiness-tab", { hasText: "Employees" }).click();
    await expect(page).toHaveURL(/\/hr-admin\/payroll-readiness\?tab=employees/);
    await expect(page.locator(".payroll-readiness-table")).toBeVisible();
    await expect(page.locator(".payroll-readiness-detail-panel")).toBeVisible();
    await expectRightAlignedWithin(
      page.locator(".payroll-toolbar").first(),
      page.locator(".payroll-filter-form").first(),
      "employee filter form",
    );
    await page.getByRole("link", { name: /^Warning\b/ }).click();
    await expect(page).toHaveURL(/status=warning/);
    await expect(page).toHaveURL(/tab=employees/);
    await page.getByRole("link", { name: /^All\b/ }).click();
    await expect(page).toHaveURL(/status=all/);

    await page.getByLabel("Search", { exact: true }).fill("");
    await page.getByLabel("Period start", { exact: true }).fill("2026-09-01");
    await page.getByLabel("Period end", { exact: true }).fill("2026-09-30");
    await Promise.all([
      page.waitForURL((url) =>
        url.searchParams.get("tab") === "employees" &&
        url.searchParams.get("period_start") === "2026-09-01" &&
        url.searchParams.get("period_end") === "2026-09-30",
      ),
      page.getByRole("button", { name: "Apply" }).click(),
    ]);

    const firstEmployee = page.locator(".payroll-readiness-table tbody a").first();
    await expect(firstEmployee).toBeVisible();
    await firstEmployee.click();
    await expect(page).toHaveURL(/employeeId=/);
    await expect(page.locator(".payroll-readiness-detail-panel[aria-label$='readiness detail']")).toBeVisible();

    await page.locator(".payroll-readiness-tab", { hasText: "Setup Health" }).click();
    await expect(page).toHaveURL(/\/hr-admin\/payroll-readiness\?tab=setup/);
    const setupGrid = page.locator(".payroll-readiness-setup-grid");
    await expect(setupGrid).toBeVisible();
    await expect(setupGrid.getByRole("link", { name: "Open setup" })).toHaveAttribute("href", "/hr-admin/payroll-setup");
    await expect(setupGrid.getByRole("link", { name: "Open employees" })).toHaveAttribute("href", "/hr-admin/employees");
    await expect(setupGrid.getByRole("link", { name: "Open providers" })).toHaveAttribute("href", "/hr-admin/payroll-providers");
    await expectRightAlignedWithin(
      setupGrid.locator(".payroll-readiness-setup-card").first(),
      setupGrid.locator(".payroll-readiness-setup-card .button").first(),
      "setup-card action",
    );

    await page.locator(".payroll-readiness-tab", { hasText: "Evidence" }).click();
    await expect(page).toHaveURL(/\/hr-admin\/payroll-readiness\?tab=evidence/);
    await expect(page.locator(".payroll-readiness-evidence-grid")).toBeVisible();
    await expect(page.getByRole("link", { name: "Open close readiness report" })).toHaveAttribute("href", "/hr-admin/reports/payroll-close-readiness");

    await expectNoAppError(page);
    await expectNoHorizontalOverflow(page);
  });

  test("certifies payroll cycle steps, route ownership, action panels, and safe states", async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1440, height: 960 });
    for (const route of payrollRoutes) {
      await expectPayrollRoute(page, route);
    }
  });

  test("certifies payroll cycle responsive integrity at 1366px and tablet width", async ({ page }) => {
    test.setTimeout(180_000);
    for (const viewport of [
      { width: 1366, height: 900 },
      { width: 820, height: 1180 },
    ]) {
      await page.setViewportSize(viewport);
      for (const route of payrollRoutes) {
        await expectPayrollRoute(page, route);
      }
    }
  });
});
