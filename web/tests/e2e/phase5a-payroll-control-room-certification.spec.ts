import { expect, test, type Locator, type Page } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated, hrAdmin } from "../helpers/staging-auth";

function main(page: Page) {
  return page.locator("main").first();
}

function metric(page: Page, label: string) {
  return main(page).locator("article").filter({ hasText: label }).first();
}

function table(page: Page, className: string) {
  return main(page).locator(`table.${className}`).first();
}

async function expectHeaderLinks(page: Page, links: Array<[string, string | RegExp]>) {
  for (const [name, href] of links) {
    const link = main(page).getByRole("link", { name, exact: true });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", href);
  }
}

async function expectTableHeaders(target: Locator, headers: string[]) {
  await expect(target).toBeVisible();
  for (const header of headers) {
    await expect(target.locator("thead")).toContainText(header);
  }
}

async function clickFirstMainLinkIfPresent(page: Page, hrefPattern: RegExp, expectedUrl: RegExp) {
  const hrefLink = main(page).locator("a").filter({ hasText: /.+/ }).evaluateAll((nodes, patternSource) => {
    const regex = new RegExp(String(patternSource));
    const match = nodes.find((node) => regex.test((node as HTMLAnchorElement).getAttribute("href") ?? ""));
    return match ? (match as HTMLAnchorElement).getAttribute("href") : null;
  }, hrefPattern.source);
  const href = await hrefLink;
  if (!href) return false;
  await main(page).locator(`a[href="${href}"]`).first().click();
  await expect(page).toHaveURL(expectedUrl);
  await expectNoHorizontalOverflow(page);
  return true;
}

test.describe("Phase 5A payroll control room certification", () => {
  test("payroll readiness fully exposes filters, tabs, table, detail panel, metrics, and navigation", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/payroll-readiness", hrAdmin);
    await expectPageReady(page, "Payroll Readiness");

    await expectHeaderLinks(page, [
      ["Setup", "/hr-admin/payroll-setup"],
      ["Inputs", "/hr-admin/payroll-inputs"],
      ["Admin", "/hr-admin"],
      ["Reports", "/hr-admin/reports"],
    ]);
    for (const label of ["Employees in scope", "Ready", "Warnings", "Blocked", "Pending approvals"]) {
      await expect(metric(page, label)).toBeVisible();
    }
    await expect(main(page).getByText("Readiness table")).toBeVisible();
    await expect(main(page).getByRole("heading", { name: "Payroll source review" })).toBeVisible();
    await expect(main(page).getByLabel("Search")).toBeVisible();
    await expect(main(page).getByLabel("Period start")).toHaveValue(/\d{4}-\d{2}-\d{2}/);
    await expect(main(page).getByLabel("Period end")).toHaveValue(/\d{4}-\d{2}-\d{2}/);
    await expect(main(page).getByRole("button", { name: "Apply" })).toBeVisible();
    for (const tab of ["All", "Ready", "Warning", "Blocked"]) {
      await expect(main(page).locator(".status-tab-row").getByRole("link", { name: new RegExp(`^${tab}\\b`) })).toBeVisible();
    }
    await expectTableHeaders(table(page, "payroll-readiness-table"), ["Employee", "Status", "Entity", "Cost Center", "Attendance", "Pending", "Bank"]);
    const employeeLink = table(page, "payroll-readiness-table").locator("tbody a").first();
    if (await employeeLink.isVisible().catch(() => false)) {
      await employeeLink.click();
      await expect(page).toHaveURL(/employeeId=/);
      await expect(main(page).locator("aside[aria-label$='readiness detail']").or(main(page).getByText("Readiness detail")).first()).toBeVisible();
    }
    await main(page).getByLabel("Search").fill("NO_SUCH_PAYROLL_EMPLOYEE");
    await main(page).getByRole("button", { name: "Apply" }).click();
    await expect(page).toHaveURL(/q=NO_SUCH_PAYROLL_EMPLOYEE/);
    await expect(main(page).getByText("No rows found.")).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("payroll calculations exposes run rail, validation, attempts, line trace, totals, and navigation", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/payroll-calculations", hrAdmin);
    await expectPageReady(page, "Payroll Calculations");

    await expectHeaderLinks(page, [
      ["Inputs", "/hr-admin/payroll-inputs"],
      ["Rules", "/hr-admin/payroll-rules"],
      ["Adjustments", "/hr-admin/payroll-adjustments"],
      ["Settlements", "/hr-admin/payroll-settlements"],
      ["Review", "/hr-admin/payroll-review"],
      ["Payroll Setup", "/hr-admin/payroll-setup"],
      ["Salary Setup", "/hr-admin/salary-setup"],
    ]);
    for (const label of ["Calculable runs", "Calculations", "Lines", "Validation", "Latest net pay"]) {
      await expect(metric(page, label)).toBeVisible();
    }
    await expect(main(page).getByText("Calculation queue").first()).toBeVisible();
    await expect(main(page).getByText("Calculation attempts").first()).toBeVisible();
    await expect(main(page).getByText("Calculation validation").first()).toBeVisible();
    await expectTableHeaders(table(page, "payroll-calc-attempt-table"), ["Attempt", "Status", "Profile", "Lines", "Net pay", "Calculated"]);
    await expectTableHeaders(table(page, "payroll-calc-line-table"), ["Employee", "Component", "Type", "Amount", "Source", "Hash"]);
    await clickFirstMainLinkIfPresent(page, /lineId=/, /\/hr-admin\/payroll-calculations\?.*lineId=/);
    await expect(main(page).getByText("Source hash").or(main(page).getByText("Formula")).or(main(page).getByText("Line trace")).first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("payroll review exposes exception register, approvals, final lock strip, approved lines, and navigation", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/payroll-review", hrAdmin);
    await expectPageReady(page, "Payroll Review");

    await expectHeaderLinks(page, [
      ["Calculations", "/hr-admin/payroll-calculations"],
      ["Inputs", "/hr-admin/payroll-inputs"],
      ["Rules", "/hr-admin/payroll-rules"],
      ["Payroll Setup", "/hr-admin/payroll-setup"],
      ["Outputs", "/hr-admin/payroll-outputs"],
    ]);
    for (const label of ["Reviews", "Open reviews", "Open blockers", "Latest net pay"]) {
      await expect(metric(page, label)).toBeVisible();
    }
    await expect(main(page).getByText("Review queue").first()).toBeVisible();
    await expect(main(page).getByText("Final lock").first()).toBeVisible();
    await expect(main(page).getByRole("link", { name: "Open trace" })).toHaveAttribute("href", /\/hr-admin\/payroll-calculations\?runId=.*calculationId=/);
    await expectTableHeaders(table(page, "payroll-review-exception-table"), ["Exception", "Employee", "Severity", "Status", "Decision"]);
    await expect(main(page).getByRole("heading", { name: "Approval trail" })).toBeVisible();
    await expectTableHeaders(table(page, "payroll-review-line-table"), ["Employee", "Component", "Amount", "Rule", "Source"]);
    await clickFirstMainLinkIfPresent(page, /exceptionId=/, /\/hr-admin\/payroll-review\?.*exceptionId=/);
    await expect(main(page).getByText("Exception detail").or(main(page).getByText("No exception selected")).first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("payroll outputs exposes publish state, artifact register, handoff readiness, and selected artifact details", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/payroll-outputs", hrAdmin);
    await expectPageReady(page, "Payroll Outputs");

    await expectHeaderLinks(page, [
      ["Review", "/hr-admin/payroll-review"],
      ["Handoff", "/hr-admin/payroll-handoff"],
      ["Calculations", "/hr-admin/payroll-calculations"],
      ["Rules", "/hr-admin/payroll-rules"],
      ["Payroll Setup", "/hr-admin/payroll-setup"],
    ]);
    for (const label of ["Output batches", "Artifacts", "Payslips", "Latest net pay"]) {
      await expect(metric(page, label)).toBeVisible();
    }
    await expect(main(page).getByText("Publish state")).toBeVisible();
    await expect(main(page).getByText("Generated").first()).toBeVisible();
    await expect(main(page).getByText("Published").first()).toBeVisible();
    await expect(main(page).getByText("Output profile")).toBeVisible();
    await expectTableHeaders(table(page, "payroll-output-artifact-table"), ["Artifact", "Kind", "Employee", "Net pay", "Status"]);
    await expect(main(page).getByRole("heading", { name: "Finance handoff readiness" })).toBeVisible();
    await clickFirstMainLinkIfPresent(page, /artifactId=/, /\/hr-admin\/payroll-outputs\?.*artifactId=/);
    await expect(main(page).getByText("Artifact detail").or(main(page).getByText("No artifact selected")).first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("payroll handoff exposes transmission state, finance artifacts, audit pack controls, and provider evidence", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/payroll-handoff", hrAdmin);
    await expectPageReady(page, "Payroll Handoff");

    await expectHeaderLinks(page, [
      ["Outputs", "/hr-admin/payroll-outputs"],
      ["Review", "/hr-admin/payroll-review"],
      ["Calculations", "/hr-admin/payroll-calculations"],
      ["Providers", "/hr-admin/payroll-providers"],
    ]);
    for (const label of ["Handoffs", "Finance artifacts", "Filing files", "Callbacks", "Retries", "Provider jobs", "Audit packs", "Reconciled", "Latest net pay"]) {
      await expect(metric(page, label)).toBeVisible();
    }
    await expect(main(page).getByText("Transmission state")).toBeVisible();
    for (const label of ["Bank advice", "Accounting net", "Statutory total", "Artifacts", "Filing files"]) {
      await expect(main(page).locator(".payroll-handoff-total-grid article").filter({ hasText: label }).first()).toBeVisible();
    }
    for (const label of ["Generated", "Transmitted", "Accepted", "Reconciled", "Audit pack"]) {
      await expect(main(page).locator(".payroll-handoff-control-strip").filter({ hasText: label })).toBeVisible();
    }
    await expect(main(page).getByRole("button", { name: "Generate audit pack" })).toBeVisible();
    await expect(main(page).getByText("Provider").or(main(page).getByText("Delivery")).or(main(page).getByText("Finance")).first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
