import { expect, type Page, test } from "@playwright/test";

import { expectNoAppError, expectNoHorizontalOverflow, suppressBrowserTestNoise } from "../helpers/assertions";
import { gotoAuthenticated } from "../helpers/staging-auth";

type ReportRoute = {
  path: string;
  heading: string | RegExp;
  stripHeading: string | RegExp;
  testId: string;
  searchPlaceholder?: string;
  exportKey?: string;
  verifyManifestApi?: boolean;
};

const representativeReports: ReportRoute[] = [
  {
    path: "/hr-admin/reports/workforce",
    heading: "Employee Master Report",
    stripHeading: "Employee master evidence",
    testId: "workforce-report",
    searchPlaceholder: "Search name, code, org, manager",
    exportKey: "workforce",
    verifyManifestApi: true,
  },
  {
    path: "/hr-admin/reports/attendance-register",
    heading: "Daily Attendance Register",
    stripHeading: "Attendance register evidence",
    testId: "attendance-register-report",
    searchPlaceholder: "Search employee, department, status, notes",
    exportKey: "attendance-register",
    verifyManifestApi: true,
  },
  {
    path: "/hr-admin/reports/leave-balance",
    heading: "Leave Balance Report",
    stripHeading: "Leave balance evidence",
    testId: "leave-balance-report",
    searchPlaceholder: "Search employee, policy, leave type",
    exportKey: "leave-balance",
    verifyManifestApi: true,
  },
  {
    path: "/hr-admin/reports/payroll-register",
    heading: "Payroll Register Report",
    stripHeading: "Payroll register evidence",
    testId: "payroll-register-report",
    searchPlaceholder: "Search run, file, profile, hash",
    exportKey: "payroll-register",
    verifyManifestApi: false,
  },
];

async function gotoDemoHrAdmin(page: Page, path: string) {
  await gotoAuthenticated(page, path);
  await suppressBrowserTestNoise(page);
}

async function expectReportRoute(page: Page, report: ReportRoute) {
  await gotoDemoHrAdmin(page, report.path);
  await expect(page.locator("main.shell:not(.app-loading-shell)").first()).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: report.heading })).toBeVisible();
  await expect(page.locator(".report-insights-strip").getByRole("heading", { name: report.stripHeading })).toBeVisible();

  const workspace = page.getByTestId(report.testId);
  await expect(workspace).toBeVisible();
  await expect(workspace.getByRole("link", { name: "Export filtered CSV" })).toHaveAttribute("href", new RegExp(`/api/hr-admin/reports/${report.exportKey}`));
  await expect(workspace.getByRole("link", { name: "Manifest" })).toHaveAttribute("href", new RegExp(`/api/hr-admin/reports/${report.exportKey}.*format=manifest`));
  if (report.searchPlaceholder) {
    await workspace.getByPlaceholder(report.searchPlaceholder).fill("zz-no-report-row-phase13");
    await expect(workspace.getByText(/No .*match|No rows match|Showing 0|0 rows/i).first()).toBeVisible();
    await workspace.getByPlaceholder(report.searchPlaceholder).fill("");
  }

  await expectNoAppError(page);
  await expectNoHorizontalOverflow(page);
}

test.describe("HR Admin reports phase 13 certification", () => {
  test("certifies report catalog search, filters, pagination, and evidence links", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 960 });
    await gotoDemoHrAdmin(page, "/hr-admin/reports");

    await expect(page.getByRole("heading", { level: 1, name: "Reports" })).toBeVisible();
    await expect(page.locator(".report-insights-strip").getByRole("heading", { name: "Report control center" })).toBeVisible();

    const catalog = page.getByTestId("report-catalog-workspace");
    await expect(catalog).toBeVisible();
    for (const column of ["Report", "Owner", "Filters", "Exports", "Evidence", "Status", "Actions"]) {
      await expect(catalog.getByRole("columnheader", { name: column })).toBeVisible();
    }

    await catalog.getByPlaceholder("Search by report, field, or owner").fill("daily attendance");
    await expect(catalog.getByText("Daily attendance register")).toBeVisible();
    await expect(catalog.getByRole("link", { name: "Export" })).toHaveAttribute("href", /\/api\/hr-admin\/reports\/attendance-register/);
    await expect(catalog.getByRole("link", { name: "Manifest" })).toHaveAttribute("href", /\/api\/hr-admin\/reports\/attendance-register\?format=manifest/);
    await expect(catalog.getByText("Checksum")).toBeVisible();
    await expect(catalog.getByText("Audit trail")).toBeVisible();

    await catalog.getByPlaceholder("Search by report, field, or owner").fill("");
    await catalog.getByRole("tab", { name: "Payroll Finance" }).click();
    await expect(catalog.getByRole("tab", { name: "Payroll Finance" })).toHaveAttribute("aria-selected", "true");
    await expect(catalog.getByText("Payroll register")).toBeVisible();

    await catalog.getByRole("tab", { name: "All" }).click();
    await catalog.getByRole("button", { name: "Next" }).click();
    await expect(catalog.getByText(/Showing \d+-\d+ of \d+/)).toBeVisible();
    await catalog.getByRole("button", { name: "Previous" }).click();
    await expect(catalog.getByText("Employee master report")).toBeVisible();

    await expectNoAppError(page);
    await expectNoHorizontalOverflow(page);
  });

  test("certifies representative report workspaces, filters, export links, and manifests", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 960 });
    for (const report of representativeReports) {
      await expectReportRoute(page, report);
      if (report.verifyManifestApi) {
        const manifestResponse = await page.request.get(`/api/hr-admin/reports/${report.exportKey}?format=manifest`);
        expect(manifestResponse.status(), `${report.exportKey} manifest should load`).toBe(200);
        expect(manifestResponse.headers()["x-hrms-report-key"]).toBe(report.exportKey);
        const manifest = await manifestResponse.json();
        expect(manifest.report_key ?? report.exportKey).toBe(report.exportKey);
        expect(JSON.stringify(manifest)).toMatch(/checksum|schema|source|evidence/i);
      }
    }
  });

  test("certifies export audit history workspace and filtering states", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 900 });
    await gotoDemoHrAdmin(page, "/hr-admin/reports/export-audits");

    await expect(page.getByRole("heading", { level: 1, name: "Export Audit History" })).toBeVisible();
    await expect(page.locator(".compliance-evidence-strip").getByRole("heading", { name: "Download and manifest audit" })).toBeVisible();

    const workspace = page.getByTestId("report-export-audit-workspace");
    await expect(workspace).toBeVisible();
    await expect(workspace.locator(".metric-tile").filter({ hasText: "Audit records" })).toBeVisible();
    await expect(workspace.locator(".metric-tile").filter({ hasText: "CSV exports" })).toBeVisible();
    await expect(workspace.locator(".metric-tile").filter({ hasText: "Manifests" })).toBeVisible();
    await expect(workspace.getByPlaceholder("Search report, checksum, filters, request")).toBeVisible();
    await expect(workspace.getByRole("combobox", { name: "Report key" })).toBeVisible();
    await expect(workspace.getByRole("combobox", { name: "Export type" })).toBeVisible();

    await workspace.getByPlaceholder("Search report, checksum, filters, request").fill("zz-no-export-audit-phase13");
    await expect(workspace.getByText(/No export audit records match|Loading export audit history/)).toBeVisible();

    await expectNoAppError(page);
    await expectNoHorizontalOverflow(page);
  });

  test("certifies report pages remain responsive at tablet width", async ({ page }) => {
    await page.setViewportSize({ width: 820, height: 1180 });
    await gotoDemoHrAdmin(page, "/hr-admin/reports");
    await expect(page.getByTestId("report-catalog-workspace")).toBeVisible();
    await expectNoHorizontalOverflow(page);

    for (const report of [representativeReports[0], representativeReports[1], representativeReports[3]]) {
      await expectReportRoute(page, report);
    }
  });
});
