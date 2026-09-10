import { expect, test, type Locator, type Page } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated } from "../helpers/staging-auth";

function uniqueCode(prefix: string) {
  return `PW_${prefix}_${Date.now()}`;
}

function field(scope: Locator, label: string) {
  return scope
    .getByText(label, { exact: true })
    .locator("xpath=ancestor::label[1]")
    .locator("input, select, textarea")
    .first();
}

async function expectFields(scope: Locator, labels: string[]) {
  for (const label of labels) {
    await expect(field(scope, label)).toBeVisible();
  }
}

async function expectOptions(scope: Locator, label: string, minimum = 1) {
  const count = await field(scope, label).evaluate((element) => {
    const select = element as HTMLSelectElement;
    return Array.from(select.options).filter((option) => option.value).length;
  });
  expect(count).toBeGreaterThanOrEqual(minimum);
}

async function submitAndCapture<T>(page: Page, path: string, method: "POST" | "PATCH", action: () => Promise<void>) {
  const [response] = await Promise.all([
    page.waitForResponse((item) => item.url().includes(`/api/hr-admin/${path}`) && item.request().method() === method),
    action(),
  ]);
  return {
    ok: response.ok(),
    status: response.status(),
    payload: (await response.json().catch(() => ({}))) as T,
  };
}

test.describe("HR admin payroll setup flows", () => {
  test("setup workspace exposes every payroll setup section and navigation action", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/payroll-setup");
    await expectPageReady(page, "Payroll Setup");

    for (const link of ["Readiness", "Inputs", "Salary Setup", "Rules", "Calculations", "Organization"]) {
      await expect(page.getByRole("link", { name: link, exact: true })).toBeVisible();
    }

    for (const metric of ["Calendars", "Open periods", "Active groups", "Assigned employees"]) {
      await expect(page.locator(".metric-tile-soft").filter({ hasText: metric })).toBeVisible();
    }

    await expect(page.getByRole("heading", { name: "Period control" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Configuration matrix" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Run windows" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Payroll setup controls" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Group" }).first()).toBeVisible();
    for (const header of ["Status", "Scope", "Calendar", "Employees", "Currency", "Employee", "Effective"]) {
      await expect(page.getByRole("columnheader", { name: header }).first()).toBeVisible();
    }

    const payGroupLink = page.locator("main a[href*='payGroupId=']").first();
    if (await payGroupLink.isVisible().catch(() => false)) {
      await payGroupLink.click();
      await expect(page).toHaveURL(/payGroupId=/);
      await expect(page.getByRole("heading", { name: "Run windows" }).or(page.getByText("Assignments")).first()).toBeVisible();
    }

    await expectNoHorizontalOverflow(page);
  });

  test("payroll setup browser CRUD creates, updates, and validates setup records", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/payroll-setup");
    await expectPageReady(page, "Payroll Setup");

    const calendarForm = page.getByTestId("payroll-calendar-form");
    const periodForm = page.getByTestId("payroll-period-form");
    const payGroupForm = page.getByTestId("pay-group-form");
    const assignmentForm = page.getByTestId("pay-group-assignment-form");

    await expectFields(calendarForm, ["Code", "Name", "Frequency", "Timezone", "Currency code", "Period start day", "Config profile reference"]);
    await expect(calendarForm.getByRole("checkbox", { name: "Active calendar" })).toBeVisible();
    await expectOptions(calendarForm, "Frequency");

    const calendarCode = uniqueCode("PAY_CAL");
    const calendarResult = await submitAndCapture<{ id: string; code: string; name: string }>(page, "payroll-calendars", "POST", async () => {
      await field(calendarForm, "Code").fill(calendarCode);
      await field(calendarForm, "Name").fill(`Browser ${calendarCode}`);
      await field(calendarForm, "Frequency").selectOption("monthly");
      await field(calendarForm, "Timezone").fill("Asia/Kolkata");
      await field(calendarForm, "Currency code").fill("INR");
      await field(calendarForm, "Period start day").fill("1");
      await field(calendarForm, "Config profile reference").fill("payroll.calendar.browser.profile.v1");
      await calendarForm.getByRole("checkbox", { name: "Active calendar" }).check();
      await calendarForm.getByRole("button", { name: "Create calendar" }).click();
    });
    expect(calendarResult.ok).toBeTruthy();
    await expect(page.getByText(calendarCode).first()).toBeVisible();

    const duplicateResult = await submitAndCapture<{ code?: string[] }>(page, "payroll-calendars", "POST", async () => {
      await calendarForm.getByRole("button", { name: "New" }).click();
      await field(calendarForm, "Code").fill(calendarCode);
      await field(calendarForm, "Name").fill(`Duplicate ${calendarCode}`);
      await calendarForm.getByRole("button", { name: "Create calendar" }).click();
    });
    expect(duplicateResult.ok).toBeFalsy();
    await expect(page.getByText(/Save failed|code:/i).first()).toBeVisible();

    await calendarForm.getByRole("button", { name: new RegExp(calendarCode) }).first().click();
    await expect(field(calendarForm, "Code")).toHaveValue(calendarCode);
    await submitAndCapture(page, `payroll-calendars/${calendarResult.payload.id}`, "PATCH", async () => {
      await field(calendarForm, "Name").fill(`Updated ${calendarCode}`);
      await field(calendarForm, "Period start day").fill("5");
      await calendarForm.getByRole("button", { name: "Save calendar" }).click();
    }).then((result) => expect(result.ok).toBeTruthy());
    await expect(field(calendarForm, "Period start day")).toHaveValue("5");

    await expectFields(periodForm, ["Calendar", "Code", "Name", "Start date", "End date", "Pay date", "Status", "Config profile reference"]);
    await expectOptions(periodForm, "Calendar");
    await expectOptions(periodForm, "Status");
    const periodCode = uniqueCode("PAY_PER");
    const periodResult = await submitAndCapture<{ id: string; code: string; name: string }>(page, "payroll-periods", "POST", async () => {
      await field(periodForm, "Calendar").selectOption(calendarResult.payload.id);
      await field(periodForm, "Code").fill(periodCode);
      await field(periodForm, "Name").fill(`Browser ${periodCode}`);
      await field(periodForm, "Start date").fill("2026-06-01");
      await field(periodForm, "End date").fill("2026-06-30");
      await field(periodForm, "Pay date").fill("2026-07-01");
      await field(periodForm, "Status").selectOption("draft");
      await field(periodForm, "Config profile reference").fill("payroll.period.browser.profile.v1");
      await periodForm.getByRole("button", { name: "Create period" }).click();
    });
    expect(periodResult.ok).toBeTruthy();
    await expect(page.getByText(periodCode).first()).toBeVisible();

    await submitAndCapture(page, `payroll-periods/${periodResult.payload.id}`, "PATCH", async () => {
      await field(periodForm, "Status").selectOption("open");
      await field(periodForm, "Pay date").fill("2026-07-02");
      await periodForm.getByRole("button", { name: "Save period" }).click();
    }).then((result) => expect(result.ok).toBeTruthy());
    await expect(page.getByText(/payroll period saved/i).first()).toBeVisible();

    await expectFields(payGroupForm, [
      "Calendar",
      "Code",
      "Name",
      "Status",
      "Default currency code",
      "Legal entity",
      "Branch",
      "Location",
      "Department",
      "Employment type",
      "Config profile reference",
    ]);
    await expectOptions(payGroupForm, "Calendar");
    await expectOptions(payGroupForm, "Status");
    await expectOptions(payGroupForm, "Legal entity");
    await expectOptions(payGroupForm, "Branch");
    await expectOptions(payGroupForm, "Location");
    await expectOptions(payGroupForm, "Department");
    await expectOptions(payGroupForm, "Employment type");
    const payGroupCode = uniqueCode("PAY_GROUP");
    const payGroupResult = await submitAndCapture<{ id: string; code: string; name: string }>(page, "pay-groups", "POST", async () => {
      await field(payGroupForm, "Calendar").selectOption(calendarResult.payload.id);
      await field(payGroupForm, "Code").fill(payGroupCode);
      await field(payGroupForm, "Name").fill(`Browser ${payGroupCode}`);
      await field(payGroupForm, "Status").selectOption("draft");
      await field(payGroupForm, "Default currency code").fill("INR");
      await field(payGroupForm, "Legal entity").selectOption({ index: 1 });
      await field(payGroupForm, "Branch").selectOption({ index: 1 });
      await field(payGroupForm, "Location").selectOption({ index: 1 });
      await field(payGroupForm, "Department").selectOption({ index: 1 });
      await field(payGroupForm, "Employment type").selectOption({ index: 1 });
      await field(payGroupForm, "Config profile reference").fill("payroll.paygroup.browser.profile.v1");
      await payGroupForm.getByRole("button", { name: "Create pay group" }).click();
    });
    expect(payGroupResult.ok).toBeTruthy();
    await expect(page.getByText(payGroupCode).first()).toBeVisible();

    await submitAndCapture(page, `pay-groups/${payGroupResult.payload.id}`, "PATCH", async () => {
      await field(payGroupForm, "Status").selectOption("active");
      await field(payGroupForm, "Name").fill(`Updated ${payGroupCode}`);
      await payGroupForm.getByRole("button", { name: "Save pay group" }).click();
    }).then((result) => expect(result.ok).toBeTruthy());
    await expect(page.getByText(`Updated ${payGroupCode}`).first()).toBeVisible();

    await expectFields(assignmentForm, ["Pay group", "Employee", "Effective from", "Effective to", "Status", "Config profile reference"]);
    await expectOptions(assignmentForm, "Pay group");
    await expectOptions(assignmentForm, "Employee");
    await expectOptions(assignmentForm, "Status");
    const assignmentResult = await submitAndCapture<{ id: string }>(page, "pay-group-assignments", "POST", async () => {
      await field(assignmentForm, "Pay group").selectOption(payGroupResult.payload.id);
      await field(assignmentForm, "Employee").selectOption({ index: 0 });
      await field(assignmentForm, "Effective from").fill("2026-06-01");
      await field(assignmentForm, "Effective to").fill("2026-06-30");
      await field(assignmentForm, "Status").selectOption("draft");
      await field(assignmentForm, "Config profile reference").fill("payroll.assignment.browser.profile.v1");
      await assignmentForm.getByRole("button", { name: "Create assignment" }).click();
    });
    expect(assignmentResult.ok).toBeTruthy();
    await expect(page.getByText(/pay group assignment saved/i).first()).toBeVisible();

    await submitAndCapture(page, `pay-group-assignments/${assignmentResult.payload.id}`, "PATCH", async () => {
      await field(assignmentForm, "Effective to").fill("2026-07-31");
      await assignmentForm.getByRole("button", { name: "Save assignment" }).click();
    }).then((result) => expect(result.ok).toBeTruthy());
    await expect(field(assignmentForm, "Effective to")).toHaveValue("2026-07-31");
    await expectNoHorizontalOverflow(page);
  });

  test("payroll setup controls remain usable on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoAuthenticated(page, "/hr-admin/payroll-setup");
    await expectPageReady(page, "Payroll Setup");

    await expect(page.getByRole("heading", { name: "Payroll setup controls" })).toBeVisible();
    for (const testId of ["payroll-calendar-form", "payroll-period-form", "pay-group-form", "pay-group-assignment-form"]) {
      await expect(page.getByTestId(testId)).toBeVisible();
    }
    await expect(field(page.getByTestId("payroll-calendar-form"), "Frequency")).toBeVisible();
    await expect(field(page.getByTestId("pay-group-assignment-form"), "Employee")).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
