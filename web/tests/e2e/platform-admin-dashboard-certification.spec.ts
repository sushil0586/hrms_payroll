import { expect, type Locator, type Page, test } from "@playwright/test";

import { expectNoAppError, expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated, platformAdmin } from "../helpers/staging-auth";

type PlatformSummary = {
  counts: {
    tenants: number;
    active_tenants: number;
    sandbox_tenants: number;
    onboarding_tenants: number;
    handoff_ready_tenants: number;
    baseline_pending_tenants: number;
    active_leads: number;
    new_leads: number;
    policy_packs: number;
    published_policy_packs: number;
  };
  lead_queue: { id: string; company_name: string; status: string }[];
  stale_onboarding_tenants: { id: string; code: string; name: string; onboarding_status: string }[];
};

const requiredDashboardCards = [
  "Mission queue",
  "Tenant pipeline",
  "Risk radar",
  "Activation blockers",
  "Command shortcuts",
  "Evidence trail",
] as const;

const dashboardViewports = [
  { label: "1920", width: 1920, height: 1080 },
  { label: "1440", width: 1440, height: 900 },
  { label: "1366", width: 1366, height: 768 },
  { label: "1024", width: 1024, height: 768 },
  { label: "tablet", width: 768, height: 1024 },
] as const;

function card(page: Page, heading: string | RegExp): Locator {
  return page.locator("article").filter({ has: page.getByRole("heading", { name: heading }) }).first();
}

function metric(page: Page, label: string): Locator {
  return page.locator(".metric-tile").filter({ has: page.locator(".metric-tile__label", { hasText: label }) }).first();
}

function detailRow(root: Locator, label: string): Locator {
  return root.locator(".detail-row").filter({ has: root.page().locator(".detail-label", { hasText: label }) }).first();
}

async function apiSummary(page: Page) {
  const response = await page.request.get("/api/platform/summary/");
  expect(response.ok(), `platform summary status ${response.status()}`).toBeTruthy();
  return (await response.json()) as PlatformSummary;
}

async function expectMetric(page: Page, label: string, value: number, trend?: RegExp | string) {
  const tile = metric(page, label);
  await expect(tile, `${label} metric tile`).toBeVisible();
  await expect(tile.locator(".metric-tile__value")).toHaveText(String(value));
  if (trend) {
    await expect(tile.locator(".metric-tile__trend")).toHaveText(trend);
  }
}

async function expectNoBrowserNoise(page: Page, errors: string[], failedRequests: string[]) {
  await expectNoAppError(page);
  await expectNoHorizontalOverflow(page);
  expect(errors, "unexpected console/page errors").toEqual([]);
  expect(failedRequests, "unexpected failed platform admin requests").toEqual([]);
}

function boxesOverlap(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
) {
  const tolerance = 1;
  return !(
    a.x + a.width <= b.x + tolerance ||
    b.x + b.width <= a.x + tolerance ||
    a.y + a.height <= b.y + tolerance ||
    b.y + b.height <= a.y + tolerance
  );
}

async function expectShortcutButtonsFit(page: Page) {
  const shortcuts = card(page, "Command shortcuts");
  const shortcutGrid = shortcuts.locator(".platform-command-grid");
  const gridBox = await shortcutGrid.boundingBox();
  expect(gridBox, "shortcut grid bounds").toBeTruthy();
  const buttons = shortcutGrid.getByRole("link");
  await expect(buttons).toHaveCount(6);
  const boxes = [];
  for (let index = 0; index < 6; index += 1) {
    const button = buttons.nth(index);
    await expect(button).toBeVisible();
    const box = await button.boundingBox();
    expect(box, `shortcut ${index} bounds`).toBeTruthy();
    if (gridBox && box) {
      expect(box.x, `shortcut ${index} left edge`).toBeGreaterThanOrEqual(gridBox.x - 1);
      expect(box.x + box.width, `shortcut ${index} right edge`).toBeLessThanOrEqual(gridBox.x + gridBox.width + 1);
      expect(box.width, `shortcut ${index} usable width`).toBeGreaterThan(90);
      boxes.push(box);
    }
  }
  for (let left = 0; left < boxes.length; left += 1) {
    for (let right = left + 1; right < boxes.length; right += 1) {
      expect(boxesOverlap(boxes[left], boxes[right]), `shortcut ${left} overlaps shortcut ${right}`).toBeFalsy();
    }
  }
}

async function openDashboard(page: Page) {
  await gotoAuthenticated(page, "/platform-admin", platformAdmin);
  await expectPageReady(page, "Platform Admin Dashboard");
  await expect(page.getByTestId("platform-admin-control-center")).toBeVisible();
}

test.describe("Platform admin dashboard certification", () => {
  test("certifies dashboard metrics, widgets, shortcuts, back-forward, refresh, and API health", async ({ page }) => {
    const browserErrors: string[] = [];
    const failedRequests: string[] = [];
    page.on("console", (message) => {
      if (["error"].includes(message.type()) && !/favicon|Failed to load resource/i.test(message.text())) {
        browserErrors.push(message.text());
      }
    });
    page.on("pageerror", (error) => browserErrors.push(error.message));
    page.on("requestfailed", (request) => {
      const url = request.url();
      const failureText = request.failure()?.errorText ?? "";
      if (url.includes("_rsc=") && failureText.includes("ERR_ABORTED")) {
        return;
      }
      if (url.includes("/platform") || url.includes("/api/auth")) {
        failedRequests.push(`${request.method()} ${url} ${failureText}`);
      }
    });

    await page.setViewportSize({ width: 1440, height: 900 });
    await openDashboard(page);
    const summary = await apiSummary(page);
    const controlActions = summary.counts.active_leads + summary.counts.onboarding_tenants;

    await expectMetric(page, "Open control actions", controlActions, "Leads and tenant gates");
    await expectMetric(page, "Tenants", summary.counts.tenants, "Platform catalog");
    await expectMetric(page, "Active tenants", summary.counts.active_tenants, "Activated");
    await expectMetric(page, "Onboarding", summary.counts.onboarding_tenants, "Not yet active");
    await expectMetric(page, "Public leads", summary.counts.active_leads, `${summary.counts.new_leads} new`);
    await expectMetric(page, "Published packs", summary.counts.published_policy_packs, `${summary.counts.policy_packs} total packs`);

    for (const heading of requiredDashboardCards) {
      await expect(card(page, heading), `${heading} card`).toBeVisible();
    }

    const missionQueue = card(page, "Mission queue");
    await expect(missionQueue.locator(".record-chip").first()).toHaveText(`${summary.lead_queue.length} priority leads`);
    if (summary.lead_queue.length) {
      for (const lead of summary.lead_queue.slice(0, 3)) {
        await expect(missionQueue.getByText(lead.company_name, { exact: true })).toBeVisible();
      }
      await expect(missionQueue.getByRole("link", { name: "Open queue" }).first()).toHaveAttribute("href", /\/platform-admin\/leads/);
    } else {
      await expect(missionQueue.getByText("No active public leads need review.")).toBeVisible();
    }

    const tenantPipeline = card(page, "Tenant pipeline");
    await expect(detailRow(tenantPipeline, "Active").locator(".detail-value")).toHaveText(String(summary.counts.active_tenants));
    await expect(detailRow(tenantPipeline, "Not active").locator(".detail-value")).toHaveText(String(summary.counts.onboarding_tenants));
    await expect(detailRow(tenantPipeline, "Setup pending").locator(".detail-value")).toHaveText(String(summary.counts.baseline_pending_tenants));
    await expect(detailRow(tenantPipeline, "Go-live handoff ready").locator(".detail-value")).toHaveText(String(summary.counts.handoff_ready_tenants));
    await expect(tenantPipeline.getByRole("link", { name: "Open tenants" })).toHaveAttribute("href", /\/platform-admin\/tenants/);

    const riskRadar = card(page, "Risk radar");
    await expect(riskRadar.getByText("New public leads")).toBeVisible();
    await expect(riskRadar.getByText("Tenants not active")).toBeVisible();
    await expect(riskRadar.getByText("Published setup templates")).toBeVisible();
    await expect(riskRadar.getByText("Review and qualify inbound requests.")).toBeVisible();
    await expect(riskRadar.getByText("Move prepared tenants through setup confirmation, admin access, readiness, and activation.")).toBeVisible();
    await expect(riskRadar.getByRole("link", { name: "Resolve" })).toHaveCount(3);
    const riskExpectations = [
      { label: "New public leads", path: /\/platform-admin\/leads/ },
      { label: "Tenants not active", path: /\/platform-admin\/tenants/ },
      { label: "Published setup templates", path: /\/platform-admin\/policy-packs/ },
    ];
    for (const item of riskExpectations) {
      const riskRow = riskRadar.locator(".platform-dashboard-row").filter({ hasText: item.label }).first();
      await expect(riskRow.getByRole("link", { name: "Resolve" })).toHaveAttribute("href", item.path);
    }

    const blockers = card(page, "Activation blockers");
    await expect(blockers.locator(".record-chip").first()).toHaveText(`${summary.stale_onboarding_tenants.length} shown`);
    if (summary.stale_onboarding_tenants.length) {
      const tenant = summary.stale_onboarding_tenants[0];
      await expect(blockers.getByText(tenant.name, { exact: true })).toBeVisible();
      await blockers.getByRole("link", { name: "Review" }).first().click();
      await expect(page).toHaveURL(new RegExp(`/platform-admin/onboarding\\?tenantId=${tenant.id}`));
      await expect(page.getByTestId("platform-admin-onboarding-panel")).toBeVisible();
      await page.goBack({ waitUntil: "domcontentloaded" });
      await expect(page).toHaveURL(/\/platform-admin$/);
      await expect(page.getByTestId("platform-admin-control-center")).toBeVisible();
      await page.goForward({ waitUntil: "domcontentloaded" });
      await expect(page).toHaveURL(new RegExp(`/platform-admin/onboarding\\?tenantId=${tenant.id}`));
      await page.goBack({ waitUntil: "domcontentloaded" });
      await expect(page.getByTestId("platform-admin-control-center")).toBeVisible();
    } else {
      await expect(blockers.getByText("No tenant activation blockers in this view.")).toBeVisible();
    }

    const shortcuts = card(page, "Command shortcuts");
    const shortcutExpectations = [
      { name: "Review leads", path: /\/platform-admin\/leads/ },
      { name: "Create tenant", path: /\/platform-admin\/tenants/ },
      { name: "Create admin access", path: /\/platform-admin\/admins/ },
      { name: "Setup templates", path: /\/platform-admin\/policy-packs/ },
      { name: "Ops health", path: /\/hr-admin\/saas-operations/ },
      { name: "Resilience", path: /\/hr-admin\/saas-resilience/ },
    ];
    for (const item of shortcutExpectations) {
      const shortcut = shortcuts.getByRole("link", { name: item.name });
      await expect(shortcut, `${item.name} shortcut`).toBeVisible();
      await expect(shortcut).toHaveAttribute("href", item.path);
    }
    await expectShortcutButtonsFit(page);

    await shortcuts.getByRole("link", { name: "Review leads" }).click();
    await expect(page).toHaveURL(/\/platform-admin\/leads/);
    await expect(page.getByTestId("platform-admin-leads-panel")).toBeVisible();
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("platform-admin-leads-panel")).toBeVisible();
    await page.getByRole("link", { name: "Dashboard", exact: true }).click();
    await expect(page.getByTestId("platform-admin-control-center")).toBeVisible();

    const evidenceTrail = card(page, "Evidence trail");
    await expect(evidenceTrail.getByRole("link", { name: "Open events" })).toHaveAttribute("href", /\/platform-admin\/audit-logs/);
    await evidenceTrail.getByRole("link", { name: "Open events" }).click();
    await expect(page).toHaveURL(/\/platform-admin\/audit-logs/);
    await expect(page.getByTestId("platform-admin-events-panel")).toBeVisible();

    await openDashboard(page);
    await page.reload({ waitUntil: "domcontentloaded" });
    await expectPageReady(page, "Platform Admin Dashboard");
    await expectMetric(page, "Open control actions", controlActions, "Leads and tenant gates");
    await expectNoBrowserNoise(page, browserErrors, failedRequests);
  });

  test("certifies responsive dashboard layout and keyboard focus across supported viewports", async ({ page }) => {
    for (const viewport of dashboardViewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await openDashboard(page);
      await expectNoHorizontalOverflow(page);
      for (const heading of requiredDashboardCards) {
        await expect(card(page, heading), `${heading} card at ${viewport.label}`).toBeVisible();
      }
      await expectShortcutButtonsFit(page);
      const screenshot = await page.screenshot({ fullPage: true, animations: "disabled" });
      expect(screenshot.length, `${viewport.label} dashboard screenshot`).toBeGreaterThan(1000);
      await test.info().attach(`platform-admin-dashboard-${viewport.label}`, {
        body: screenshot,
        contentType: "image/png",
      });
    }

    await page.setViewportSize({ width: 1440, height: 900 });
    await openDashboard(page);
    await page.keyboard.press("Tab");
    await expect(page.locator(":focus")).toBeVisible();
    await page.keyboard.press("Tab");
    await expect(page.locator(":focus")).toBeVisible();

    const reviewLeads = card(page, "Command shortcuts").getByRole("link", { name: "Review leads" });
    await reviewLeads.focus();
    await expect(reviewLeads).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/platform-admin\/leads/);
    await expect(page.getByTestId("platform-admin-leads-panel")).toBeVisible();
  });
});
