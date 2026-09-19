import { expect, type Page, test } from "@playwright/test";

import { expectNoAppError, suppressBrowserTestNoise } from "../helpers/assertions";

type RouteExpectation = {
  path: string;
  heading: string | RegExp;
  selectors: string[];
  visibleText?: Array<string | RegExp>;
};

const routeExpectations: RouteExpectation[] = [
  {
    path: "/hr-admin",
    heading: "People Operations Control Center",
    selectors: ["[data-testid='hr-admin-control-center']", ".hr-admin-kpi-strip", ".hr-admin-workspace-grid"],
    visibleText: ["Items that need your attention", "Operational readiness", "Focused workspaces"],
  },
  {
    path: "/hr-admin/employees",
    heading: /Employee/i,
    selectors: [".hr-employee-workbench", ".hr-employee-command-panel", ".hr-employee-kpi-grid"],
    visibleText: [/Search/i],
  },
  {
    path: "/hr-admin/payroll-readiness",
    heading: /Payroll/i,
    selectors: [".payroll-cycle-journey"],
    visibleText: ["Payroll source review"],
  },
  {
    path: "/hr-admin/attendance-records",
    heading: /Attendance/i,
    selectors: [".time-leave-strip"],
    visibleText: ["Attendance records workbench"],
  },
  {
    path: "/hr-admin/payroll-statutory",
    heading: /Statutory/i,
    selectors: [".compliance-evidence-strip"],
    visibleText: ["Statutory evidence control"],
  },
  {
    path: "/hr-admin/reports",
    heading: /Reports/i,
    selectors: [".report-insights-strip"],
    visibleText: ["Report control center"],
  },
  {
    path: "/hr-admin/reports/workforce",
    heading: /Employee Master Report/i,
    selectors: [".report-insights-strip", "[data-testid='workforce-report']"],
    visibleText: ["Workforce report", "Employee master evidence"],
  },
  {
    path: "/hr-admin/reports/lifecycle-queue",
    heading: /Lifecycle Queue Report/i,
    selectors: [".report-insights-strip"],
    visibleText: ["Lifecycle queue evidence"],
  },
  {
    path: "/hr-admin/saas-operations",
    heading: /SaaS Operations/i,
    selectors: [".operations-governance-strip"],
    visibleText: ["Tenant operating command", "Ops health"],
  },
  {
    path: "/hr-admin/saas-control-plane",
    heading: /SaaS Control Plane/i,
    selectors: [".operations-governance-strip"],
    visibleText: ["Commercial and entitlement control", "Control plane"],
  },
  {
    path: "/hr-admin/saas-resilience",
    heading: /SaaS Resilience/i,
    selectors: [".operations-governance-strip"],
    visibleText: ["Backup, restore, and retention proof", "Resilience"],
  },
  {
    path: "/hr-admin/saas-sla-operations",
    heading: /SaaS SLA Ops/i,
    selectors: [".operations-governance-strip"],
    visibleText: ["Incident and SLA operating view", "SLA ops"],
  },
  {
    path: "/hr-admin/notifications-admin",
    heading: /Notifications/i,
    selectors: [".operations-governance-strip"],
    visibleText: ["Notification operations control", "Notification templates"],
  },
  {
    path: "/hr-admin/launch-remediation",
    heading: /Launch Remediation/i,
    selectors: [".operations-governance-strip", ".launch-remediation-toolbar"],
    visibleText: ["Launch blocker command desk", "Assignment filters"],
  },
  {
    path: "/hr-admin/import-history",
    heading: /Import History/i,
    selectors: [".operations-governance-strip", "[data-testid='import-history-workspace']"],
    visibleText: ["Bulk import evidence ledger", "Import batches"],
  },
];

async function gotoDemoHrAdmin(page: Page, path: string) {
  await page.context().addCookies([
    {
      name: "hrms_access_token",
      value: "playwright-demo-token",
      url: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3100",
    },
  ]);
  await page.goto(path, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
}

async function expectEnterpriseRoute(page: Page, expectation: RouteExpectation) {
  await gotoDemoHrAdmin(page, expectation.path);
  await suppressBrowserTestNoise(page);
  await expect(page.locator("main.shell:not(.app-loading-shell)").first()).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: expectation.heading })).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`${expectation.path.replaceAll("/", "\\/")}(\\?|$)`));
  for (const selector of expectation.selectors) {
    await expect(page.locator(selector).first(), `${expectation.path} should render ${selector}`).toBeVisible();
  }
  for (const text of expectation.visibleText ?? []) {
    await expect(page.locator("main").getByText(text).first(), `${expectation.path} should show ${String(text)}`).toBeVisible();
  }
  await expectNoAppError(page);
  const overflow = await page.evaluate(() => {
    const root = document.documentElement;
    const body = document.body;
    return Math.max(root.scrollWidth - root.clientWidth, body.scrollWidth - body.clientWidth);
  });
  expect(overflow, `${expectation.path} should not overflow horizontally`).toBeLessThanOrEqual(1);
}

test.describe("HR Admin enterprise UI phase 9 certification", () => {
  test("certifies premium HR Admin routes and shared control patterns on desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 960 });
    for (const expectation of routeExpectations) {
      await expectEnterpriseRoute(page, expectation);
    }
  });

  test("certifies premium HR Admin routes stay usable at 1366px", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 900 });
    for (const expectation of routeExpectations) {
      await expectEnterpriseRoute(page, expectation);
    }
  });

  test("certifies shared strips stack cleanly on tablet width", async ({ page }) => {
    await page.setViewportSize({ width: 820, height: 1180 });
    for (const expectation of routeExpectations.filter((item) =>
      ["/hr-admin", "/hr-admin/reports", "/hr-admin/saas-operations", "/hr-admin/import-history", "/hr-admin/payroll-statutory"].includes(item.path),
    )) {
      await expectEnterpriseRoute(page, expectation);
    }
  });
});
