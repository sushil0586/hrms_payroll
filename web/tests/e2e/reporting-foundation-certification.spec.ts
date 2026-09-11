import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { employee, gotoAuthenticated, hrAdmin } from "../helpers/staging-auth";

test.describe("Phase R0 reporting foundation certification", () => {
  test("HR admin can use the report catalog filters, tabs, pagination, drilldowns, and exports", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/reports", hrAdmin);
    await expectPageReady(page, "Reports");

    const catalog = page.getByTestId("report-catalog-workspace");
    await expect(catalog).toBeVisible();
    await expect(catalog.getByRole("tab", { name: "All" })).toHaveAttribute("aria-selected", "true");
    await expect(catalog.getByRole("columnheader", { name: "Report" })).toBeVisible();
    await expect(catalog.getByRole("columnheader", { name: "Owner" })).toBeVisible();
    await expect(catalog.getByRole("columnheader", { name: "Filters" })).toBeVisible();
    await expect(catalog.getByRole("columnheader", { name: "Exports" })).toBeVisible();
    await expect(catalog.getByRole("columnheader", { name: "Status" })).toBeVisible();
    await expect(catalog.getByRole("columnheader", { name: "Actions" })).toBeVisible();

    const search = catalog.getByPlaceholder("Search by report, field, or owner");
    await search.fill("tds");
    await expect(catalog.getByText("TDS e-file readiness report")).toBeVisible();
    await expect(catalog.getByText("Payroll register")).toHaveCount(0);

    await search.fill("");
    await catalog.getByLabel("Owner role").selectOption("Payroll Finance Manager");
    await expect(catalog.getByText("Payroll register")).toBeVisible();
    await search.fill("tds");
    await expect(catalog.getByText("TDS e-file readiness report")).toBeVisible();
    await search.fill("");

    await catalog.getByLabel("Status").selectOption("Ready");
    await expect(catalog.getByText("Payroll register")).toBeVisible();
    await expect(catalog.getByText("TDS e-file readiness report")).toHaveCount(0);

    await catalog.getByLabel("Status").selectOption("All");
    await catalog.getByLabel("Owner role").selectOption("All");
    await catalog.getByRole("tab", { name: "Compliance" }).click();
    await expect(catalog.getByRole("tab", { name: "Compliance" })).toHaveAttribute("aria-selected", "true");
    await expect(catalog.getByText("TDS e-file readiness report")).toBeVisible();
    await expect(catalog.getByText("Statutory deduction summary")).toBeVisible();

    await catalog.getByRole("tab", { name: "All" }).click();
    await expect(catalog.getByText(/of 19/)).toBeVisible();
    await catalog.getByRole("button", { name: "Next" }).click();
    await expect(catalog.getByText("Salary variance report")).toBeVisible();
    await catalog.getByRole("button", { name: "Previous" }).click();
    await expect(catalog.getByText("Employee master report")).toBeVisible();

    await search.fill("lifecycle aging");
    await expect(catalog.getByText("Lifecycle aging and SLA report")).toBeVisible();
    await search.fill("");

    await search.fill("daily attendance");
    await expect(catalog.getByText("Daily attendance register")).toBeVisible();
    await expect(catalog.getByRole("link", { name: "Export" })).toHaveAttribute("href", /\/api\/hr-admin\/reports\/attendance-register/);
    await search.fill("");

    await search.fill("leave balance");
    await expect(catalog.getByText("Leave balance report")).toBeVisible();
    await expect(catalog.getByRole("link", { name: "Export" })).toHaveAttribute("href", /\/api\/hr-admin\/reports\/leave-balance/);
    await search.fill("");

    await search.fill("attendance exceptions");
    await expect(catalog.getByText("Attendance exceptions SLA report")).toBeVisible();
    await expect(catalog.getByRole("link", { name: "Export" })).toHaveAttribute("href", /\/api\/hr-admin\/reports\/attendance-exceptions/);
    await search.fill("");

    await search.fill("payroll input exceptions");
    await expect(catalog.getByText("Payroll input exceptions report")).toBeVisible();
    await expect(catalog.getByRole("link", { name: "Export" })).toHaveAttribute("href", /\/api\/hr-admin\/reports\/payroll-input-exceptions/);
    await search.fill("");

    await search.fill("payroll review exceptions");
    await expect(catalog.getByText("Payroll review exceptions report")).toBeVisible();
    await expect(catalog.getByRole("link", { name: "Export" })).toHaveAttribute("href", /\/api\/hr-admin\/reports\/payroll-review-exceptions/);
    await search.fill("");

    await expect(catalog.getByRole("link", { name: "Export" }).first()).toHaveAttribute("href", /\/api\/hr-admin\/reports\//);
    const workforceExport = await page.request.get("/api/hr-admin/reports/workforce");
    expect(workforceExport.status()).toBe(200);
    expect(workforceExport.headers()["content-type"]).toContain("text/csv");
    expect(await workforceExport.text()).toContain("employee_code");

    await catalog.getByRole("tab", { name: "Payroll Finance" }).click();
    await catalog.getByRole("link", { name: "Open" }).first().click();
    await expect(page).toHaveURL(/\/hr-admin\/reports\/payroll-register/);
    await expectPageReady(page, "Payroll Register Report");
    await expectNoHorizontalOverflow(page);
  });

  test("employee cannot directly access HR admin report catalog or exports", async ({ page }) => {
    await gotoAuthenticated(page, "/ess", employee);
    await expectPageReady(page, "Self Service");

    await page.goto("/hr-admin/reports", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
    await expect(page.getByTestId("report-catalog-workspace")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Choose your workspace" })).toBeVisible();
    await expect(page.getByRole("link", { name: "HR admin restricted" })).toBeVisible();

    const exportResponse = await page.request.get("/api/hr-admin/reports/workforce");
    expect([302, 401, 403, 404]).toContain(exportResponse.status());
  });
});
