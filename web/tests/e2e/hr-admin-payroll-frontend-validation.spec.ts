import { expect, test, type Locator, type Page } from "@playwright/test";

import { expectNoAppError, expectNoHorizontalOverflow, expectPageReady, suppressBrowserTestNoise } from "../helpers/assertions";
import { hrAdmin } from "../helpers/staging-auth";

async function gotoHrAdminDemo(page: Page, path: string) {
  await page.request.post("/api/auth/logout").catch(() => null);
  await page.context().clearCookies();
  const response = await page.request.post("/api/auth/login", {
    data: {
      identifier: hrAdmin.username,
      password: hrAdmin.password,
    },
  });
  expect(response.ok(), await response.text()).toBeTruthy();
  await page.goto(path, { waitUntil: "networkidle" });
}

function field(scope: Page | Locator, label: string) {
  return scope.locator(`label.form-field:has(span:text-is("${label.replaceAll('"', '\\"')}"))`).locator("input, select, textarea").first();
}

async function openSetupActions(page: Page) {
  await page.getByRole("link", { name: /Setup Actions/ }).click();
  await page.waitForLoadState("networkidle");
}

async function openStatutoryActions(page: Page) {
  await page.getByRole("link", { name: "Setup actions", exact: true }).click();
  await page.waitForLoadState("networkidle");
}

test.describe("HR Admin payroll frontend validation", () => {
  test.describe.configure({ timeout: 60_000 });

  test("payroll setup calendar blocks invalid currency and start day before API", async ({ page }) => {
    let apiCalls = 0;
    await page.route("**/api/hr-admin/payroll-calendars", async (route) => {
      apiCalls += 1;
      await route.fulfill({ status: 500, contentType: "application/json", body: "{}" });
    });

    await gotoHrAdminDemo(page, "/hr-admin/payroll-setup");
    await suppressBrowserTestNoise(page);
    await expectPageReady(page, "Payroll Setup");
    await openSetupActions(page);

    const form = page.getByTestId("payroll-calendar-form");
    await expect(form).toBeVisible();
    await field(form, "Currency code").fill("I");
    await field(form, "Period start day").fill("32");
    await page.getByRole("button", { name: "Create calendar" }).click();

    await expect(form.getByText("Currency code must be a 3-letter ISO code such as INR.")).toBeVisible();
    await expect(form.getByText("Period start day must be a whole number between 1 and 31.")).toBeVisible();
    expect(apiCalls).toBe(0);
    await expectNoAppError(page);
    await expectNoHorizontalOverflow(page);
  });

  test("payroll setup period blocks invalid date sequencing before API", async ({ page }) => {
    let apiCalls = 0;
    await page.route("**/api/hr-admin/payroll-periods", async (route) => {
      apiCalls += 1;
      await route.fulfill({ status: 500, contentType: "application/json", body: "{}" });
    });

    await gotoHrAdminDemo(page, "/hr-admin/payroll-setup");
    await suppressBrowserTestNoise(page);
    await expectPageReady(page, "Payroll Setup");
    await openSetupActions(page);
    await page.getByRole("button", { name: /Periods/ }).click();

    const form = page.getByTestId("payroll-period-form");
    await expect(form).toBeVisible();
    await field(form, "Start date").fill("2026-05-31");
    await field(form, "End date").fill("2026-05-01");
    await field(form, "Pay date").fill("2026-05-15");
    await page.getByRole("button", { name: "Create period" }).click();

    await expect(form.getByText("Payroll period end date cannot be earlier than the start date.")).toBeVisible();
    await expect(form.getByText("Pay date cannot be earlier than the period start date.")).toBeVisible();
    expect(apiCalls).toBe(0);
    await expectNoAppError(page);
    await expectNoHorizontalOverflow(page);
  });

  test("salary setup component line blocks invalid amount choices before API", async ({ page }) => {
    let apiCalls = 0;
    await page.route("**/api/hr-admin/salary-structure-components", async (route) => {
      apiCalls += 1;
      await route.fulfill({ status: 500, contentType: "application/json", body: "{}" });
    });

    await gotoHrAdminDemo(page, "/hr-admin/salary-setup");
    await suppressBrowserTestNoise(page);
    await expectPageReady(page, "Salary Setup");
    await openSetupActions(page);
    await page.getByRole("button", { name: /Lines/ }).click();

    const form = page.getByTestId("salary-line-form");
    await expect(form).toBeVisible();
    await field(form, "Amount").fill("");
    await field(form, "Percentage").fill("");
    await field(form, "Formula reference").fill("");
    await page.getByRole("button", { name: "Create component line" }).click();

    await expect(page.getByText("Set an amount, percentage, or formula reference before saving a component line.")).toBeVisible();
    expect(apiCalls).toBe(0);
    await expectNoAppError(page);
    await expectNoHorizontalOverflow(page);
  });

  test("salary assignment import blocks invalid row values before API", async ({ page }) => {
    let apiCalls = 0;
    await page.route("**/api/hr-admin/employee-salary-assignments", async (route) => {
      apiCalls += 1;
      await route.fulfill({ status: 500, contentType: "application/json", body: "{}" });
    });

    await gotoHrAdminDemo(page, "/hr-admin/salary-setup#salary-assignment-import-workbench");
    await suppressBrowserTestNoise(page);
    await expectPageReady(page, "Salary Setup");
    await openSetupActions(page);

    const workbench = page.getByTestId("salary-assignment-import-workbench");
    await expect(workbench).toBeVisible();
    await workbench.getByRole("button", { name: "Load sample template" }).click();
    const csvData = field(workbench, "CSV data");
    const sample = await csvData.inputValue();
    const [headers, row] = sample.split(/\r?\n/);
    const cells = row.split(",");
    cells[3] = "2026-99-99";
    cells[6] = "-1";
    cells[7] = "";
    await csvData.fill(`${headers}\n${cells.join(",")}`);

    await workbench.getByRole("button", { name: "Preview import" }).click();

    await expect(workbench.getByRole("alert")).toContainText("Preview found blocked rows.");
    await expect(workbench.getByText("Effective from must be a valid date.")).toBeVisible();
    await expect(workbench.getByText("Annual CTC override must be zero or a positive amount.")).toBeVisible();
    await expect(workbench.getByText("Assignment reason is required before activating employee salary coverage.")).toBeVisible();
    await expect(workbench.getByRole("button", { name: "Commit ready rows" })).toBeDisabled();
    expect(apiCalls).toBe(0);
    await expectNoAppError(page);
    await expectNoHorizontalOverflow(page);
  });

  test("payroll rule definition blocks required identity and invalid tags before API", async ({ page }) => {
    let apiCalls = 0;
    await page.route("**/api/hr-admin/payroll-rule-definitions", async (route) => {
      apiCalls += 1;
      await route.fulfill({ status: 500, contentType: "application/json", body: "{}" });
    });

    await gotoHrAdminDemo(page, "/hr-admin/payroll-rules");
    await suppressBrowserTestNoise(page);
    await expectPageReady(page, "Payroll Rules");
    await openSetupActions(page);

    const form = page.getByTestId("payroll-rule-definition-form");
    await expect(form).toBeVisible();
    await field(form, "Code").fill("");
    await field(form, "Name").fill("");
    await field(form, "Tags JSON").fill("{bad json");
    await form.locator("button[type='submit']").click();

    await expect(form.getByText("Enter a unique payroll rule code.")).toBeVisible();
    await expect(form.getByText("Enter the payroll rule name.")).toBeVisible();
    await expect(form.getByText("Rule tags must be valid JSON.")).toBeVisible();
    expect(apiCalls).toBe(0);
    await expectNoAppError(page);
    await expectNoHorizontalOverflow(page);
  });

  test("payroll rule version blocks numeric, date, expression, and JSON errors before API", async ({ page }) => {
    let apiCalls = 0;
    await page.route("**/api/hr-admin/payroll-rule-versions", async (route) => {
      apiCalls += 1;
      await route.fulfill({ status: 500, contentType: "application/json", body: "{}" });
    });

    await gotoHrAdminDemo(page, "/hr-admin/payroll-rules");
    await suppressBrowserTestNoise(page);
    await expectPageReady(page, "Payroll Rules");
    await openSetupActions(page);
    await page.getByRole("button", { name: /Versions/ }).click();

    const form = page.getByTestId("payroll-rule-version-form");
    await expect(form).toBeVisible();
    await field(form, "Version").fill("0");
    await field(form, "Expression").fill("");
    await field(form, "Effective from").fill("2026-06-30");
    await field(form, "Effective to").fill("2026-06-01");
    await field(form, "Input schema JSON").fill("{bad json");
    await field(form, "Output schema JSON").fill("{bad json");
    await field(form, "Config snapshot JSON").fill("{bad json");
    await form.locator("button[type='submit']").click();

    await expect(form.getByText("Version must be a whole number greater than or equal to 1.")).toBeVisible();
    await expect(form.getByText("Enter the payroll rule expression.")).toBeVisible();
    await expect(form.getByText("Effective to must be the same as or after effective from.")).toBeVisible();
    await expect(form.getByText("Input schema must be valid JSON.")).toBeVisible();
    await expect(form.getByText("Output schema must be valid JSON.")).toBeVisible();
    await expect(form.getByText("Config snapshot must be valid JSON.")).toBeVisible();
    expect(apiCalls).toBe(0);
    await expectNoAppError(page);
    await expectNoHorizontalOverflow(page);
  });

  test("payroll input run blocks required identity before API", async ({ page }) => {
    let apiCalls = 0;
    await page.route("**/api/hr-admin/payroll-runs", async (route) => {
      apiCalls += 1;
      await route.fulfill({ status: 500, contentType: "application/json", body: "{}" });
    });

    await gotoHrAdminDemo(page, "/hr-admin/payroll-inputs");
    await suppressBrowserTestNoise(page);
    await expectPageReady(page, "Payroll Inputs");

    const form = page.getByTestId("payroll-run-form");
    await expect(form).toBeVisible();
    await field(form, "Code").fill("");
    await field(form, "Name").fill("");
    await field(form, "Input profile ref").fill("");
    await field(form, "Snapshot schema ref").fill("");
    await form.locator("button[type='submit']").click();

    await expect(form.getByText("Enter a unique payroll run code.")).toBeVisible();
    await expect(form.getByText("Enter the payroll run name.")).toBeVisible();
    await expect(form.getByText("Enter the input profile reference.")).toBeVisible();
    await expect(form.getByText("Enter the snapshot schema reference.")).toBeVisible();
    expect(apiCalls).toBe(0);
    await expectNoAppError(page);
    await expectNoHorizontalOverflow(page);
  });

  test("payroll input snapshot blocks missing profile and invalid JSON before API", async ({ page }) => {
    let apiCalls = 0;
    await page.route("**/api/hr-admin/payroll-input-snapshots", async (route) => {
      apiCalls += 1;
      await route.fulfill({ status: 500, contentType: "application/json", body: "{}" });
    });

    await gotoHrAdminDemo(page, "/hr-admin/payroll-inputs");
    await suppressBrowserTestNoise(page);
    await expectPageReady(page, "Payroll Inputs");
    await page.getByRole("button", { name: /Input snapshot/ }).click();

    const form = page.getByTestId("payroll-input-snapshot-form");
    await expect(form).toBeVisible();
    await field(form, "Input profile ref").fill("");
    await field(form, "Employee snapshot JSON").fill("{bad json");
    await field(form, "Organization snapshot JSON").fill("{bad json");
    await field(form, "Salary snapshot JSON").fill("{bad json");
    await field(form, "Attendance snapshot JSON").fill("{bad json");
    await field(form, "Validation snapshot JSON").fill("{bad json");
    await expect(form.locator("button[type='submit']")).toBeDisabled();
    expect(apiCalls).toBe(0);
    await expectNoAppError(page);
    await expectNoHorizontalOverflow(page);
  });

  test("payroll provider setup blocks required route fields and invalid config JSON before API", async ({ page }) => {
    let apiCalls = 0;
    await page.route("**/api/hr-admin/payroll-provider-connections/*", async (route) => {
      apiCalls += 1;
      await route.fulfill({ status: 500, contentType: "application/json", body: "{}" });
    });

    await gotoHrAdminDemo(page, "/hr-admin/payroll-providers");
    await suppressBrowserTestNoise(page);
    await expectPageReady(page, "Payroll Providers");
    await page.getByRole("button", { name: "Configure provider" }).first().click();

    const dialog = page.getByRole("dialog", { name: "Configure provider connection" });
    await expect(dialog).toBeVisible();
    await field(dialog, "Provider name").fill("");
    await field(dialog, "Provider ref").fill("");
    await field(dialog, "Environment").fill("");
    await field(dialog, "Adapter ref").fill("");
    await field(dialog, "Channel ref").fill("");
    await field(dialog, "Credential ref").fill("");
    await field(dialog, "Credential profile").fill("");
    await field(dialog, "Callback profile").fill("");
    await field(dialog, "Callback verification").fill("");
    await field(dialog, "Retry policy").fill("");
    await field(dialog, "Certification profile").fill("");
    await field(dialog, "Advanced config JSON").fill("{bad json");
    await dialog.getByRole("button", { name: "Save provider" }).click();

    await expect(dialog.getByText("Provider name is required before this provider setup can be saved.")).toBeVisible();
    await expect(dialog.getByText("Provider ref is required before this provider setup can be saved.")).toBeVisible();
    await expect(dialog.getByText("Environment is required before this provider setup can be saved.")).toBeVisible();
    await expect(dialog.getByText("Adapter ref is required for a real or live provider route.")).toBeVisible();
    await expect(dialog.getByText("Channel ref is required for a real or live provider route.")).toBeVisible();
    await expect(dialog.getByText("Callback profile is required for a real or live provider route.")).toBeVisible();
    await expect(dialog.getByText("Callback verification is required for a real or live provider route.")).toBeVisible();
    await expect(dialog.getByText("Retry policy is required for a real or live provider route.")).toBeVisible();
    await expect(dialog.getByText("Certification profile is required for a real or live provider route.")).toBeVisible();
    await expect(dialog.getByText("Config JSON is invalid.")).toBeVisible();
    expect(apiCalls).toBe(0);
    await expectNoAppError(page);
    await expectNoHorizontalOverflow(page);
  });

  test("statutory slab blocks invalid numeric ranges before API", async ({ page }) => {
    let apiCalls = 0;
    await page.route("**/api/hr-admin/payroll-statutory-slabs", async (route) => {
      apiCalls += 1;
      await route.fulfill({ status: 500, contentType: "application/json", body: "{}" });
    });

    await gotoHrAdminDemo(page, "/hr-admin/payroll-statutory");
    await suppressBrowserTestNoise(page);
    await expectPageReady(page, "Payroll Statutory");
    await openStatutoryActions(page);
    await page.getByRole("button", { name: /Catalog/ }).click();

    const form = page.getByTestId("statutory-slab-form");
    await expect(form).toBeVisible();
    await field(form, "Slab order").fill("0");
    await field(form, "Minimum amount").fill("1000");
    await field(form, "Maximum amount").fill("999");
    await field(form, "Employee rate percent").fill("101");
    await field(form, "Employer rate percent").fill("-1");
    await field(form, "Fixed employee amount").fill("-1");
    await field(form, "Fixed employer amount").fill("-1");
    await field(form, "Wage ceiling amount").fill("-1");
    await form.locator("button[type='submit']").click();

    await expect(form.getByText("Slab order must be a whole number greater than or equal to 1.")).toBeVisible();
    await expect(form.getByText("Maximum amount must be greater than or equal to minimum amount.")).toBeVisible();
    await expect(form.getByText("Employee rate percent must be between 0 and 100.")).toBeVisible();
    await expect(form.getByText("Employer rate percent must be between 0 and 100.")).toBeVisible();
    await expect(form.getByText("Fixed employee amount must be zero or a positive amount.")).toBeVisible();
    await expect(form.getByText("Fixed employer amount must be zero or a positive amount.")).toBeVisible();
    await expect(form.getByText("Wage ceiling amount must be zero or a positive amount.")).toBeVisible();
    expect(apiCalls).toBe(0);
    await expectNoAppError(page);
    await expectNoHorizontalOverflow(page);
  });

  test("statutory profile blocks identity and amount validation before API", async ({ page }) => {
    let apiCalls = 0;
    await page.route("**/api/hr-admin/employee-statutory-profiles", async (route) => {
      apiCalls += 1;
      await route.fulfill({ status: 500, contentType: "application/json", body: "{}" });
    });

    await gotoHrAdminDemo(page, "/hr-admin/payroll-statutory");
    await suppressBrowserTestNoise(page);
    await expectPageReady(page, "Payroll Statutory");
    await openStatutoryActions(page);
    await page.getByRole("button", { name: /Profiles/ }).click();

    const form = page.getByTestId("statutory-profile-form");
    await expect(form).toBeVisible();
    await field(form, "PAN number").fill("BADPAN");
    await field(form, "UAN number").fill("123");
    await field(form, "ESI number").fill("");
    await field(form, "Previous employment income").fill("-1");
    await field(form, "Previous employment tax deducted").fill("-1");
    await form.locator("button[type='submit']").click();

    await expect(form.getByText("PAN number must use the 10-character PAN format.")).toBeVisible();
    await expect(form.getByText("UAN number must be 12 digits.")).toBeVisible();
    await expect(form.getByText("Previous employment income must be zero or a positive amount.")).toBeVisible();
    await expect(form.getByText("Previous employment tax deducted must be zero or a positive amount.")).toBeVisible();
    expect(apiCalls).toBe(0);
    await expectNoAppError(page);
    await expectNoHorizontalOverflow(page);
  });

  test("payroll output close action blocks missing handoff profile before API", async ({ page }) => {
    let apiCalls = 0;
    await page.route("**/api/hr-admin/payroll-output-batches/*/generate-finance-handoff", async (route) => {
      apiCalls += 1;
      await route.fulfill({ status: 500, contentType: "application/json", body: "{}" });
    });

    await gotoHrAdminDemo(page, "/hr-admin/payroll-outputs");
    await suppressBrowserTestNoise(page);
    await expectPageReady(page, "Payroll Outputs");

    const actions = page.getByLabel("Output controls");
    await expect(actions).toBeVisible();
    await field(actions, "Handoff profile ref").fill("");
    await actions.getByRole("button", { name: "Generate handoff" }).click();

    await expect(actions.getByText("Handoff profile ref is required before running Generate handoff.")).toBeVisible();
    expect(apiCalls).toBe(0);
    await expectNoAppError(page);
    await expectNoHorizontalOverflow(page);
  });

  test("payroll adjustment action blocks invalid amount and source before API", async ({ page }) => {
    let apiCalls = 0;
    await page.route("**/api/hr-admin/payroll-adjustments", async (route) => {
      apiCalls += 1;
      await route.fulfill({ status: 500, contentType: "application/json", body: "{}" });
    });

    await gotoHrAdminDemo(page, "/hr-admin/payroll-adjustments?tab=actions");
    await suppressBrowserTestNoise(page);
    await expectPageReady(page, "Payroll Adjustments");

    const actions = page.getByLabel("Adjustment certification actions");
    await expect(actions).toBeVisible();
    await actions.getByLabel("Adjustment amount").fill("-1");
    await actions.getByLabel("Adjustment source reference").fill("");
    await actions.getByRole("button", { name: "Create adjustment" }).click();

    await expect(actions.getByText("Adjustment amount must be zero or a positive amount.")).toBeVisible();
    await expect(actions.getByText("Adjustment source reference is required.")).toBeVisible();
    expect(apiCalls).toBe(0);
    await expectNoAppError(page);
    await expectNoHorizontalOverflow(page);
  });

  test("payroll settlement action blocks invalid amounts and source before API", async ({ page }) => {
    let apiCalls = 0;
    await page.route("**/api/hr-admin/payroll-settlements", async (route) => {
      apiCalls += 1;
      await route.fulfill({ status: 500, contentType: "application/json", body: "{}" });
    });

    await gotoHrAdminDemo(page, "/hr-admin/payroll-settlements?tab=actions");
    await suppressBrowserTestNoise(page);
    await expectPageReady(page, "Payroll Settlements");

    const actions = page.getByLabel("Settlement certification actions");
    await expect(actions).toBeVisible();
    await actions.getByLabel("Settlement gross due").fill("-1");
    await actions.getByLabel("Settlement recovery").fill("-2");
    await actions.getByLabel("Settlement source reference").fill("");
    await actions.getByRole("button", { name: "Create settlement" }).click();

    await expect(actions.getByText("Settlement gross due must be zero or a positive amount.")).toBeVisible();
    await expect(actions.getByText("Settlement recovery must be zero or a positive amount.")).toBeVisible();
    await expect(actions.getByText("Settlement source reference is required.")).toBeVisible();
    expect(apiCalls).toBe(0);
    await expectNoAppError(page);
    await expectNoHorizontalOverflow(page);
  });
});
