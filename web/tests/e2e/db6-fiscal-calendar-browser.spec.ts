import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { employee, gotoAuthenticated, requestWithBrowserSession, tenantAdmin } from "../helpers/staging-auth";

test.describe("DB-6.3 financial calendar browser certification", () => {
  test("tenant admin configures scoped calendars years periods and audited close reopen", async ({ page }) => {
    test.setTimeout(180_000);
    await gotoAuthenticated(page, "/tenant-admin/financial-calendars", tenantAdmin);
    await expectPageReady(page, "Financial years and periods");

    await page.getByLabel("Calendar code").fill("db6-apr-mar");
    await page.getByLabel("Calendar name").fill("DB6 April March Calendar");
    await page.getByLabel("Start month").fill("4");
    await page.getByLabel("Start day").fill("1");
    await page.getByLabel("Effective from").fill("2026-04-01");
    await page.getByRole("button", { name: "Save fiscal calendar" }).click();
    await expect(page.locator(".notice").filter({ hasText: "Fiscal calendar saved after backend confirmation." })).toBeVisible();
    await expect(page.getByRole("table", { name: "Fiscal calendars" }).getByText("DB6 April March Calendar")).toBeVisible();

    await page.getByLabel("Calendar code").fill("db6-calendar-year");
    await page.getByLabel("Calendar name").fill("DB6 Calendar Year Override");
    await page.getByLabel("Legal entity override").selectOption({ label: "DB6 US Entity" });
    await page.getByLabel("Start month").fill("1");
    await page.getByLabel("Effective from").fill("2026-01-01");
    await page.getByLabel("Country code").fill("US");
    await page.getByLabel("Timezone").fill("America/New_York");
    await page.getByRole("button", { name: "Save fiscal calendar" }).click();
    await expect(page.locator(".notice").filter({ hasText: "Fiscal calendar saved after backend confirmation." })).toBeVisible();
    await expect(page.getByRole("table", { name: "Fiscal calendars" }).getByText("DB6 US Entity")).toBeVisible();

    await page.getByRole("region", { name: "Create financial year" }).locator("select").selectOption({ label: "DB6 April March Calendar" });
    await page.getByLabel("Financial year code").fill("FY2026-27");
    await page.getByLabel("Financial year start").fill("2026-04-01");
    await page.getByLabel("Financial year end").fill("2027-03-31");
    await page.getByRole("button", { name: "Save financial year" }).click();
    await expect(page.locator(".notice").filter({ hasText: "Financial year saved after backend confirmation." })).toBeVisible();

    await page.getByRole("region", { name: "Create accounting period" }).locator("select").first().selectOption({ label: "FY2026-27" });
    await page.getByLabel("Accounting period code").fill("2026-04");
    await page.getByLabel("Accounting period name").fill("April 2026");
    await page.getByLabel("Sequence").fill("1");
    await page.getByLabel("Accounting period start").fill("2026-04-01");
    await page.getByLabel("Accounting period end").fill("2026-04-30");
    await page.getByRole("button", { name: "Save accounting period" }).click();
    await expect(page.locator(".notice").filter({ hasText: "Accounting period saved after backend confirmation." })).toBeVisible();

    const periodRow = page.getByRole("table", { name: "Accounting periods" }).getByRole("row", { name: /April 2026/ });
    await expect(periodRow).toContainText("open");
    await periodRow.getByRole("button", { name: "Close" }).click();
    const closeDialog = page.getByRole("dialog", { name: "Close accounting period" });
    await closeDialog.getByLabel("Reason").fill("DB-6.3 controlled month-end close");
    await closeDialog.getByRole("button", { name: "Confirm close" }).click();
    await expect(page.locator(".notice").filter({ hasText: "Accounting period closed with an audit event." })).toBeVisible();
    await expect(periodRow).toContainText("closed");
    await expect(periodRow).toContainText("1 event");
    await periodRow.getByRole("button", { name: "Reopen" }).click();
    const reopenDialog = page.getByRole("dialog", { name: "Reopen accounting period" });
    await reopenDialog.getByLabel("Reason").fill("DB-6.3 authorized correction window");
    await reopenDialog.getByRole("button", { name: "Confirm reopen" }).click();
    await expect(page.locator(".notice").filter({ hasText: "Accounting period reopened with an audit event." })).toBeVisible();
    await expect(periodRow).toContainText("open");
    await expect(periodRow).toContainText("2 events");

    await page.getByRole("button", { name: "Save accounting period" }).click();
    await expect(page.locator(".notice--error[role='alert']")).toContainText(/duplicate|overlap/i);
    await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();
    await expect(page.getByLabel("Accounting period code")).toHaveValue("2026-04");

    const evidence = await requestWithBrowserSession(page, "/api/tenant-admin/financial-calendars");
    expect(evidence.status).toBe(200);
    const payload = JSON.parse(evidence.body);
    const persisted = payload.accounting_periods.find((item: { code: string }) => item.code === "2026-04");
    expect(persisted.status).toBe("open");
    expect(persisted.reopen_count).toBe(1);
    expect(persisted.status_events).toHaveLength(2);
    await expectNoHorizontalOverflow(page);
  });

  test("employee cannot access tenant fiscal administration", async ({ page }) => {
    await gotoAuthenticated(page, "/tenant-admin/financial-calendars", employee);
    await expect(page).not.toHaveURL(/\/tenant-admin\/financial-calendars/);
    await expect(page.getByRole("heading", { name: "Financial years and periods" })).toHaveCount(0);
  });
});
