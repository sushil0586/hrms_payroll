import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import { expect, type Page, test, type TestInfo } from "@playwright/test";

import { expectPageReady } from "../helpers/assertions";
import type { RouteExpectation } from "../helpers/routes";
import { gotoAuthenticated } from "../helpers/staging-auth";

type PerformanceSample = {
  path: string;
  heading: string;
  pageReadyMs: number;
  documentResponseMs: number;
  domInteractiveMs: number;
  loadCompleteMs: number;
  transferKb: number;
  decodedBodyKb: number;
  resourceCount: number;
};

const launchRoutes: RouteExpectation[] = [
  { path: "/", heading: "Choose your workspace" },
  { path: "/hr-admin", heading: "Control center" },
  { path: "/hr-admin/payroll-readiness", heading: "Payroll Readiness" },
  { path: "/hr-admin/payroll-inputs", heading: "Payroll Inputs" },
  { path: "/hr-admin/payroll-calculations", heading: "Payroll Calculations" },
  { path: "/hr-admin/payroll-review", heading: "Payroll Review" },
  { path: "/hr-admin/payroll-outputs", heading: "Payroll Outputs" },
  { path: "/hr-admin/payroll-handoff", heading: "Payroll Handoff" },
  { path: "/hr-admin/payroll-providers", heading: "Payroll Providers" },
  { path: "/hr-admin/notifications?retry_state=retry_ready", heading: "Notification queue" },
  { path: "/hr-admin/notification-delivery", heading: "Notification delivery" },
  { path: "/tenant-admin", heading: "Tenant Admin Console" },
  { path: "/tenant-admin/security-readiness", heading: "Enterprise Security Readiness" },
  { path: "/support", heading: "Support Console" },
  { path: "/ess/payslips", heading: "Payslips" },
  { path: "/ess/notifications?subject_type=payroll_payslip", heading: "Notifications" },
  { path: "/mss/approvals", heading: "Manager inbox" },
];

const budgets = {
  pageReadyMs: 8_000,
  documentResponseMs: 4_000,
  domInteractiveMs: 6_000,
  loadCompleteMs: 8_000,
  transferKb: 8_192,
  decodedBodyKb: 24_576,
  resourceCount: 180,
};

async function writePerformanceReport(testInfo: TestInfo, samples: PerformanceSample[]) {
  const path = testInfo.outputPath("phase8d-performance-budget/performance-samples.json");
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify({ budgets, samples }, null, 2)}\n`, "utf8");
}

async function openMeasuredRoute(page: Page, route: RouteExpectation) {
  const startedAt = Date.now();
  if (route.path === "/") {
    await page.goto(route.path, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
  } else {
    await gotoAuthenticated(page, route.path);
  }
  await expectPageReady(page, route.heading);
  const pageReadyMs = Date.now() - startedAt;

  const browserTimings = await page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    const resources = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
    const transferSize = resources.reduce((total, item) => total + (item.transferSize || 0), nav?.transferSize || 0);
    const decodedBodySize = resources.reduce((total, item) => total + (item.decodedBodySize || 0), nav?.decodedBodySize || 0);
    return {
      documentResponseMs: nav ? nav.responseEnd - nav.requestStart : 0,
      domInteractiveMs: nav ? nav.domInteractive - nav.startTime : 0,
      loadCompleteMs: nav ? nav.loadEventEnd - nav.startTime : 0,
      transferKb: transferSize / 1024,
      decodedBodyKb: decodedBodySize / 1024,
      resourceCount: resources.length + (nav ? 1 : 0),
    };
  });

  return {
    path: route.path,
    heading: String(route.heading),
    pageReadyMs,
    ...browserTimings,
  };
}

test.describe("Phase 8D performance timing budgets", () => {
  test("launch-critical routes stay within local browser performance budgets", async ({ page }, testInfo) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width: 1366, height: 768 });

    const samples: PerformanceSample[] = [];
    for (const route of launchRoutes) {
      const sample = await openMeasuredRoute(page, route);
      samples.push(sample);

      expect(sample.pageReadyMs, `${route.path} page ready budget`).toBeLessThanOrEqual(budgets.pageReadyMs);
      expect(sample.documentResponseMs, `${route.path} document response budget`).toBeLessThanOrEqual(budgets.documentResponseMs);
      expect(sample.domInteractiveMs, `${route.path} DOM interactive budget`).toBeLessThanOrEqual(budgets.domInteractiveMs);
      expect(sample.loadCompleteMs, `${route.path} load completion budget`).toBeLessThanOrEqual(budgets.loadCompleteMs);
      expect(sample.transferKb, `${route.path} transfer size budget`).toBeLessThanOrEqual(budgets.transferKb);
      expect(sample.decodedBodyKb, `${route.path} decoded body budget`).toBeLessThanOrEqual(budgets.decodedBodyKb);
      expect(sample.resourceCount, `${route.path} resource count budget`).toBeLessThanOrEqual(budgets.resourceCount);
    }

    await writePerformanceReport(testInfo, samples);
  });
});
