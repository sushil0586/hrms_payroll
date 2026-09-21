import { expect, type Page, test } from "@playwright/test";

import { expectNoAppError, expectNoHorizontalOverflow, suppressBrowserTestNoise } from "../helpers/assertions";
import { gotoAuthenticated } from "../helpers/staging-auth";

type OperationsRoute = {
  path: string;
  heading: string | RegExp;
  stripHeading: string | RegExp;
  activeLabel: string;
  visibleText: Array<string | RegExp>;
};

const operationsRoutes: OperationsRoute[] = [
  {
    path: "/hr-admin/saas-operations",
    heading: "SaaS Operations",
    stripHeading: "Tenant operating command",
    activeLabel: "Ops health",
    visibleText: ["Operational triage", "Launch posture"],
  },
  {
    path: "/hr-admin/saas-control-plane",
    heading: "SaaS Control Plane",
    stripHeading: "Commercial and entitlement control",
    activeLabel: "Control plane",
    visibleText: ["Tenant commercial state", "Required entitlements"],
  },
  {
    path: "/hr-admin/saas-resilience",
    heading: "SaaS Resilience",
    stripHeading: "Backup, restore, and retention proof",
    activeLabel: "Resilience",
    visibleText: ["Readiness checks", "Backup and restore controls"],
  },
  {
    path: "/hr-admin/saas-sla-operations",
    heading: "SaaS SLA Ops",
    stripHeading: "Incident and SLA operating view",
    activeLabel: "SLA ops",
    visibleText: ["Service-impact records", "SLA triage signals"],
  },
  {
    path: "/hr-admin/notifications-admin",
    heading: "Notifications",
    stripHeading: "Notification operations control",
    activeLabel: "Notifications",
    visibleText: ["Failed delivery", "Channel health", "Manage templates", "Open diagnostics"],
  },
  {
    path: "/hr-admin/launch-remediation",
    heading: "Launch Remediation",
    stripHeading: "Launch blocker command desk",
    activeLabel: "Remediation",
    visibleText: ["Assignment filters", "Open assignments", "Blockers"],
  },
  {
    path: "/hr-admin/import-history",
    heading: "Import History",
    stripHeading: "Bulk import evidence ledger",
    activeLabel: "Import history",
    visibleText: ["Import batches", "Committed", "Blocked rows", "Rollback ready"],
  },
];

async function gotoDemoHrAdmin(page: Page, path: string) {
  await gotoAuthenticated(page, path);
  await suppressBrowserTestNoise(page);
}

async function expectVisibleText(page: Page, text: string | RegExp, message: string) {
  await expect(async () => {
    const matches = page.locator("main").getByText(text);
    const count = await matches.count();
    let hasVisibleMatch = false;
    for (let index = 0; index < count; index += 1) {
      if (await matches.nth(index).isVisible()) {
        hasVisibleMatch = true;
        break;
      }
    }
    expect(hasVisibleMatch, message).toBeTruthy();
  }).toPass({ timeout: 10_000 });
}

async function expectOperationsRoute(page: Page, route: OperationsRoute) {
  await gotoDemoHrAdmin(page, route.path);
  await expect(page.locator("main.shell:not(.app-loading-shell)").first()).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: route.heading })).toBeVisible();
  const strip = page.locator(".operations-governance-strip");
  await expect(strip).toBeVisible();
  await expect(strip.getByRole("heading", { name: route.stripHeading })).toBeVisible();
  await expect(strip.locator(".operations-governance-strip__link.is-active")).toContainText(route.activeLabel);
  for (const text of route.visibleText) {
    await expectVisibleText(page, text, `${route.path} should show ${String(text)}`);
  }
  await expectNoAppError(page);
  await expectNoHorizontalOverflow(page);
}

test.describe("HR Admin operations phase 14 certification", () => {
  test("certifies HR-facing operations pages have clear ownership and active governance navigation", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 960 });
    for (const route of operationsRoutes) {
      await expectOperationsRoute(page, route);
    }
  });

  test("certifies operations governance strip cross-navigation", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 900 });
    await gotoDemoHrAdmin(page, "/hr-admin/saas-operations");

    const expectedLinks = [
      ["/hr-admin/saas-operations", "Ops health"],
      ["/hr-admin/saas-control-plane", "Control plane"],
      ["/hr-admin/saas-resilience", "Resilience"],
      ["/hr-admin/saas-sla-operations", "SLA ops"],
      ["/hr-admin/notifications-admin", "Notifications"],
      ["/hr-admin/launch-remediation", "Remediation"],
      ["/hr-admin/import-history", "Import history"],
    ] as const;

    const strip = page.locator(".operations-governance-strip");
    for (const [href, label] of expectedLinks) {
      await expect(strip.getByRole("link", { name: new RegExp(label) })).toHaveAttribute("href", href);
    }

    await strip.getByRole("link", { name: /Control plane/ }).click();
    await expect(page).toHaveURL(/\/hr-admin\/saas-control-plane$/);
    await expect(page.getByRole("heading", { level: 1, name: "SaaS Control Plane" })).toBeVisible();
    await expectNoAppError(page);
  });

  test("certifies launch remediation filters and direct URL state", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 900 });
    await gotoDemoHrAdmin(page, "/hr-admin/launch-remediation");

    const toolbar = page.locator(".launch-remediation-toolbar");
    await expect(toolbar).toBeVisible();
    await toolbar.getByPlaceholder("gate, owner, module").fill("zz-no-launch-remediation-phase14");
    await toolbar.getByRole("combobox", { name: "Status" }).selectOption("all");
    await toolbar.getByRole("button", { name: "Apply" }).click();

    await expect(page).toHaveURL(/launch-remediation\?.*q=zz-no-launch-remediation-phase14/);
    await expect(page.getByText("No launch remediation rows")).toBeVisible();

    await gotoDemoHrAdmin(page, "/hr-admin/launch-remediation?status=ignored&severity=warning");
    await expect(page.locator(".launch-remediation-toolbar").getByRole("combobox", { name: "Status" })).toHaveValue("ignored");
    await expect(page.locator(".launch-remediation-toolbar").getByRole("combobox", { name: "Severity" })).toHaveValue("warning");
    await expectNoHorizontalOverflow(page);
  });

  test("certifies import history filters, loading/empty state, and evidence table shell", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 900 });
    await gotoDemoHrAdmin(page, "/hr-admin/import-history");

    const workspace = page.getByTestId("import-history-workspace");
    await expect(workspace).toBeVisible();
    await expect(workspace.locator(".metric-tile").filter({ hasText: "Import batches" })).toBeVisible();
    await expect(workspace.getByPlaceholder("Search type, actor, file, hash")).toBeVisible();
    await expect(workspace.getByRole("combobox", { name: "Import type" })).toBeVisible();
    await expect(workspace.getByRole("combobox", { name: "Import status" })).toBeVisible();

    await workspace.getByPlaceholder("Search type, actor, file, hash").fill("zz-no-import-batch-phase14");
    await expect(workspace.getByText(/No import batches match|Loading import history/)).toBeVisible();
    await expectNoAppError(page);
    await expectNoHorizontalOverflow(page);
  });

  test("certifies operations pages remain usable at tablet width", async ({ page }) => {
    await page.setViewportSize({ width: 820, height: 1180 });
    for (const route of [
      operationsRoutes[0],
      operationsRoutes[1],
      operationsRoutes[4],
      operationsRoutes[5],
      operationsRoutes[6],
    ]) {
      await expectOperationsRoute(page, route);
    }
  });
});
