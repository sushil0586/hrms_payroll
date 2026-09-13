import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import { expect, test, type Page, type TestInfo } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated, hrAdmin, type Persona } from "../helpers/staging-auth";

type PilotRoute = {
  path: string;
  heading: string | RegExp;
  label: string;
  persona?: Persona;
  expectedText?: string | RegExp;
  pagination?: boolean;
};

type PerformanceSample = {
  label: string;
  path: string;
  pageReadyMs: number;
  documentResponseMs: number;
  domInteractiveMs: number;
  resourceCount: number;
  decodedBodyKb: number;
};

type LayoutIssue = {
  kind: string;
  detail: string;
};

const prefix = process.env.PLAYWRIGHT_PILOT100_PREFIX ?? "PILOT100_20260912";
const seedPassword = process.env.PLAYWRIGHT_LIVE_SEED_PASSWORD ?? "Password@123";
const pilotEmployee: Persona = {
  username: process.env.PLAYWRIGHT_PILOT100_EMPLOYEE_USERNAME ?? `${prefix.toLowerCase()}.e001`,
  password: seedPassword,
};
const pilotManager: Persona = {
  username: process.env.PLAYWRIGHT_PILOT100_MANAGER_USERNAME ?? `${prefix.toLowerCase()}.e001`,
  password: seedPassword,
};

const pilotRoutes: PilotRoute[] = [
  { path: `/hr-admin/employees?q=${prefix}&page_size=50`, heading: "Employees", label: "employee-directory", expectedText: "100", pagination: true },
  { path: `/hr-admin/payroll-readiness?q=${prefix}_E096&page_size=10`, heading: "Payroll Readiness", label: "payroll-readiness", expectedText: "Missing primary bank account", pagination: true },
  { path: "/hr-admin/payroll-inputs", heading: "Payroll Inputs", label: "payroll-inputs", expectedText: /Snapshots|Payroll runs/i },
  { path: "/hr-admin/payroll-calculations", heading: "Payroll Calculations", label: "payroll-calculations", expectedText: prefix },
  { path: "/hr-admin/payroll-review", heading: "Payroll Review", label: "payroll-review", expectedText: /Review controls|Exceptions/i },
  { path: "/hr-admin/payroll-outputs", heading: "Payroll Outputs", label: "payroll-outputs", expectedText: "Artifact register", pagination: true },
  { path: "/hr-admin/payroll-handoff", heading: "Payroll Handoff", label: "payroll-handoff", expectedText: /Provider|Handoff/i, pagination: true },
  { path: "/hr-admin/reports", heading: "Reports", label: "report-catalog", expectedText: "reports", pagination: true },
  { path: "/hr-admin/reports/payroll-register", heading: /Payroll Register/i, label: "payroll-register-report", expectedText: prefix, pagination: true },
  { path: "/hr-admin/reports/payslip-publication", heading: /Payslip Publication/i, label: "payslip-publication-report", expectedText: /Published|Rows|Access/i, pagination: true },
  { path: "/hr-admin/reports/export-audits", heading: "Export Audit History", label: "export-audit-history", expectedText: "Audit records", pagination: true },
  { path: "/ess/payslips", heading: "Payslips", label: "ess-payslips", persona: pilotEmployee, expectedText: `${prefix}_E001` },
  { path: "/mss/approvals", heading: "Manager inbox", label: "mss-approvals", persona: pilotManager, expectedText: /Team members|Approval queues/i },
];

const viewports = [
  { label: "desktop", width: 1440, height: 900 },
  { label: "mobile", width: 390, height: 844 },
];

const stagingBudgets = {
  pageReadyMs: 18_000,
  documentResponseMs: 9_000,
  domInteractiveMs: 12_000,
  decodedBodyKb: 32_768,
  resourceCount: 220,
};

async function openPilotRoute(page: Page, route: PilotRoute) {
  await gotoAuthenticated(page, route.path, route.persona ?? hrAdmin);
  await expectPageReady(page, route.heading);
}

async function capturePilotUxStep(page: Page, testInfo: TestInfo, viewportLabel: string, routeLabel: string) {
  const path = testInfo.outputPath(`pilot-100-ux-performance/${viewportLabel}-${routeLabel}.png`);
  await mkdir(dirname(path), { recursive: true });
  await page.screenshot({ path, fullPage: true, animations: "disabled" });
}

async function collectLayoutIssues(page: Page): Promise<LayoutIssue[]> {
  return page.evaluate(() => {
    const issues: LayoutIssue[] = [];
    const viewportWidth = document.documentElement.clientWidth;
    const selector = [
      "a[href]",
      "button",
      "input",
      "select",
      "textarea",
      "[role='button']",
      "[role='link']",
      "[role='combobox']",
      "[role='checkbox']",
    ].join(",");

    function labelFor(element: Element) {
      return (
        element.getAttribute("aria-label") ||
        element.getAttribute("name") ||
        element.textContent ||
        element.getAttribute("placeholder") ||
        element.getAttribute("href") ||
        element.tagName
      ).trim().replace(/\s+/g, " ").slice(0, 90);
    }

    function visible(element: Element, rect: DOMRect) {
      const style = window.getComputedStyle(element);
      return rect.width > 1 && rect.height > 1 && style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity || "1") > 0.01;
    }

    function isInsideHorizontalScroller(element: Element) {
      let current = element.parentElement;
      while (current && current !== document.body) {
        const style = window.getComputedStyle(current);
        if (["auto", "scroll"].includes(style.overflowX) && current.scrollWidth > current.clientWidth + 2) return true;
        current = current.parentElement;
      }
      return false;
    }

    const controls = Array.from(document.querySelectorAll(selector))
      .map((element) => ({ element, rect: element.getBoundingClientRect(), label: labelFor(element) }))
      .filter(({ element, rect }) => visible(element, rect));

    for (const { element, rect, label } of controls) {
      if ((rect.left < -2 || rect.right > viewportWidth + 2) && !isInsideHorizontalScroller(element)) {
        issues.push({ kind: "outside-viewport", detail: `${label} extends ${Math.round(rect.left)}-${Math.round(rect.right)} of ${viewportWidth}` });
      }
      const tagName = element.tagName.toLowerCase();
      const inputType = element.getAttribute("type") || "";
      const isChoice = tagName === "input" && ["checkbox", "radio"].includes(inputType);
      const isTextField = ["input", "select", "textarea"].includes(tagName);
      const isCommand = ["a", "button"].includes(tagName) || element.getAttribute("role") === "button";
      if (!isChoice && isTextField && (rect.width < 44 || rect.height < 28)) {
        issues.push({ kind: "tiny-field", detail: `${label} is ${Math.round(rect.width)}x${Math.round(rect.height)}` });
      }
      if (isCommand && rect.width < 20 && rect.height < 20) {
        issues.push({ kind: "tiny-command", detail: `${label} is ${Math.round(rect.width)}x${Math.round(rect.height)}` });
      }
    }

    if (document.querySelectorAll("h1").length !== 1) {
      issues.push({ kind: "h1-count", detail: `Page has ${document.querySelectorAll("h1").length} h1 elements` });
    }

    return issues.slice(0, 20);
  });
}

async function measureRoute(page: Page, route: PilotRoute): Promise<PerformanceSample> {
  await page.evaluate(() => performance.clearResourceTimings());
  const startedAt = Date.now();
  await openPilotRoute(page, route);
  const pageReadyMs = Date.now() - startedAt;
  const browserTimings = await page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    const resources = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
    return {
      documentResponseMs: nav ? nav.responseEnd - nav.requestStart : 0,
      domInteractiveMs: nav ? nav.domInteractive - nav.startTime : 0,
      resourceCount: resources.length + (nav ? 1 : 0),
      decodedBodyKb: (resources.reduce((sum, item) => sum + (item.decodedBodySize || 0), nav?.decodedBodySize || 0)) / 1024,
    };
  });
  return { label: route.label, path: route.path, pageReadyMs, ...browserTimings };
}

async function writePerformanceReport(testInfo: TestInfo, samples: PerformanceSample[]) {
  const path = testInfo.outputPath("pilot-100-ux-performance/performance-samples.json");
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify({ budgets: stagingBudgets, samples }, null, 2)}\n`, "utf8");
}

test.describe.serial("P100-12 UX and performance certification", () => {
  for (const viewport of viewports) {
    test(`pilot-scale pages remain usable at ${viewport.label}`, async ({ page }, testInfo) => {
      test.setTimeout(8 * 60 * 1000);
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      for (const route of pilotRoutes) {
        await test.step(`${viewport.label}: ${route.label}`, async () => {
          await openPilotRoute(page, route);
          if (route.expectedText) await expect(page.getByText(route.expectedText).first()).toBeVisible();
          if (route.pagination) {
            await expect(page.locator(".pagination-bar").first()).toBeVisible();
          }
          await expectNoHorizontalOverflow(page);
          expect(await collectLayoutIssues(page), `${route.label} layout issues at ${viewport.label}`).toEqual([]);
          await capturePilotUxStep(page, testInfo, viewport.label, route.label);
        });
      }
    });
  }

  test("pilot-scale pages stay within staging timing budgets", async ({ page }, testInfo) => {
    test.setTimeout(6 * 60 * 1000);
    await page.setViewportSize({ width: 1366, height: 768 });

    const samples: PerformanceSample[] = [];
    for (const route of pilotRoutes.filter((item) => !["mss-approvals"].includes(item.label))) {
      samples.push(await measureRoute(page, route));
    }
    await writePerformanceReport(testInfo, samples);

    for (const sample of samples) {
      expect(sample.pageReadyMs, `${sample.label} page ready budget`).toBeLessThanOrEqual(stagingBudgets.pageReadyMs);
      expect(sample.documentResponseMs, `${sample.label} document response budget`).toBeLessThanOrEqual(stagingBudgets.documentResponseMs);
      expect(sample.domInteractiveMs, `${sample.label} DOM interactive budget`).toBeLessThanOrEqual(stagingBudgets.domInteractiveMs);
      expect(sample.decodedBodyKb, `${sample.label} decoded body budget`).toBeLessThanOrEqual(stagingBudgets.decodedBodyKb);
      expect(sample.resourceCount, `${sample.label} resource budget`).toBeLessThanOrEqual(stagingBudgets.resourceCount);
    }
  });
});
