import { expect, test, type Locator, type Page } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated } from "../helpers/staging-auth";

function uniqueCode(prefix: string) {
  return `PW_${prefix}_${Date.now()}`;
}

function form(page: Page, testId: string) {
  return page.getByTestId(testId);
}

function field(scope: Locator, label: string) {
  return scope.getByText(label, { exact: true }).locator("xpath=ancestor::label[1]").locator("input, select, textarea").first();
}

async function submitAndCapture<T>(page: Page, routePattern: RegExp, method: string, action: () => Promise<void>) {
  const [response] = await Promise.all([
    page.waitForResponse((item) => routePattern.test(item.url()) && item.request().method() === method, { timeout: 30000 }),
    action(),
  ]);
  return {
    ok: response.ok(),
    status: response.status(),
    payload: (await response.json().catch(() => ({}))) as T,
  };
}

async function createAlternateCalendarPeriodThroughBrowser(page: Page) {
  await gotoAuthenticated(page, "/hr-admin/payroll-setup");
  await expectPageReady(page, "Payroll Setup");

  const calendarForm = form(page, "payroll-calendar-form");
  const periodForm = form(page, "payroll-period-form");
  const calendarCode = uniqueCode("ALT_CAL");
  const periodCode = uniqueCode("ALT_PER");

  const calendar = await submitAndCapture<{ id: string; name: string }>(
    page,
    /\/api\/hr-admin\/payroll-calendars$/,
    "POST",
    async () => {
      await field(calendarForm, "Code").fill(calendarCode);
      await field(calendarForm, "Name").fill(`Alternate ${calendarCode}`);
      await field(calendarForm, "Frequency").selectOption("monthly");
      await field(calendarForm, "Timezone").fill("Asia/Kolkata");
      await field(calendarForm, "Currency code").fill("INR");
      await field(calendarForm, "Period start day").fill("1");
      await field(calendarForm, "Config profile reference").fill("payroll.calendar.alt.no.paygroup.v1");
      await calendarForm.getByRole("checkbox", { name: "Active calendar" }).check();
      await calendarForm.getByRole("button", { name: "Create calendar" }).click();
    },
  );
  expect(calendar.ok).toBeTruthy();

  const period = await submitAndCapture<{ id: string; name: string }>(
    page,
    /\/api\/hr-admin\/payroll-periods$/,
    "POST",
    async () => {
      await field(periodForm, "Calendar").selectOption(calendar.payload.id);
      await field(periodForm, "Code").fill(periodCode);
      await field(periodForm, "Name").fill(`Alternate ${periodCode}`);
      await field(periodForm, "Start date").fill("2026-08-01");
      await field(periodForm, "End date").fill("2026-08-31");
      await field(periodForm, "Pay date").fill("2026-09-01");
      await field(periodForm, "Status").selectOption("open");
      await field(periodForm, "Config profile reference").fill("payroll.period.alt.no.paygroup.v1");
      await periodForm.getByRole("button", { name: "Create period" }).click();
    },
  );
  expect(period.ok).toBeTruthy();
  return period.payload;
}

test.describe("HR admin payroll input snapshot flows", () => {
  test("input workspace exposes run locks, source snapshots, and live employee traces", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/payroll-inputs");
    await expectPageReady(page, "Payroll Inputs");

    await expect(page.getByRole("heading", { name: "Input control" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Hash" })).toBeVisible();
    await expect(page.getByText("Source hash").or(page.getByText("Input profile")).or(page.getByText("No input snapshots")).first()).toBeVisible();

    const snapshotLink = page.locator("main a[href*='snapshotId=']").first();
    if (await snapshotLink.isVisible().catch(() => false)) {
      await snapshotLink.click();
      await expect(page).toHaveURL(/snapshotId=/);
      await expect(page.getByText("Source hash").or(page.getByRole("heading", { name: "Lock readiness" })).first()).toBeVisible();
    }

    await expectNoHorizontalOverflow(page);
  });

  test("run form filters pay groups to the selected period calendar", async ({ page }) => {
    const alternatePeriod = await createAlternateCalendarPeriodThroughBrowser(page);

    await gotoAuthenticated(page, "/hr-admin/payroll-inputs");
    await expectPageReady(page, "Payroll Inputs");

    const runForm = form(page, "payroll-run-form");
    await field(runForm, "Period").selectOption(alternatePeriod.id);

    await expect(page.getByText("No pay groups use this period's calendar. Leave as all pay groups or create a compatible pay group.")).toBeVisible();
    const nonEmptyPayGroupOptions = await field(runForm, "Pay group").evaluate((element) => {
      const select = element as HTMLSelectElement;
      return Array.from(select.options).filter((option) => option.value).length;
    });
    expect(nonEmptyPayGroupOptions).toBe(0);
    await expectNoHorizontalOverflow(page);
  });
});
