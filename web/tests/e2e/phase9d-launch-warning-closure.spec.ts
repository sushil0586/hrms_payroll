import { expect, test, type Locator, type Page } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated, manager } from "../helpers/staging-auth";

const runSuffix = Date.now().toString(36).toUpperCase();

function field(scope: Page | Locator, label: string, index = 0) {
  return scope
    .locator("label.form-field")
    .filter({ has: scope.locator("span", { hasText: new RegExp(`^${label}$`) }) })
    .locator("input, select, textarea")
    .nth(index);
}

async function selectFirstNonEmptyOption(select: Locator) {
  const value = await select.evaluate((element) => {
    const selectElement = element as HTMLSelectElement;
    return Array.from(selectElement.options).find((option) => option.value)?.value ?? "";
  });
  expect(value).not.toBe("");
  await select.selectOption(value);
  return value;
}

async function submitAndCapture<T>(page: Page, path: string, method: "POST" | "PATCH", action: () => Promise<void>) {
  const [response] = await Promise.all([
    page.waitForResponse((item) => item.url().includes(path) && item.request().method() === method),
    action(),
  ]);
  const payload = (await response.json().catch(() => ({}))) as T;
  expect(response.ok(), `${method} ${path} failed with ${response.status()}: ${JSON.stringify(payload)}`).toBeTruthy();
  return payload;
}

async function closeMissingManagerWarnings(page: Page) {
  await gotoAuthenticated(page, "/hr-admin/employees?status=active");
  await expectPageReady(page, "Employees");

  for (let index = 0; index < 5; index += 1) {
    const noManagerRow = page.locator("a.employee-directory-item").filter({ hasText: "No manager" }).first();
    if (!(await noManagerRow.isVisible().catch(() => false))) {
      break;
    }

    await noManagerRow.click();
    await page.locator("details.action-menu summary").click();
    await page.getByRole("link", { name: "Edit employee" }).click();
    await expectPageReady(page, /Edit employee:/);
    await selectFirstNonEmptyOption(field(page, "Reporting manager"));
    await submitAndCapture(page, "/api/hr-admin/employees/", "PATCH", async () => {
      await page.getByRole("button", { name: "Save changes" }).click();
    });
    await expect(page).toHaveURL(/\/hr-admin\/employees\?employeeId=/);
    await gotoAuthenticated(page, "/hr-admin/employees?status=active");
  }

  await expectNoHorizontalOverflow(page);
}

async function closeManagerQueue(page: Page, queue: "leave" | "attendance") {
  await gotoAuthenticated(page, `/mss/approvals?queue=${queue}`, manager);
  await expectPageReady(page, "Manager inbox");

  for (let index = 0; index < 5; index += 1) {
    const emptyMessage = queue === "leave" ? "No pending leave approvals." : "No pending regularizations.";
    if (await page.getByText(emptyMessage).isVisible().catch(() => false)) {
      break;
    }

    const item = page.locator("a.tableish__row").first();
    if (!(await item.isVisible().catch(() => false))) {
      break;
    }
    await item.click();
    await expect(page.getByRole("heading", { name: queue === "leave" ? "Leave approval detail" : "Regularization detail" })).toBeVisible();
    await field(page, "Decision note").fill(`Phase 9D approval ${queue} ${runSuffix} ${index + 1}`);

    const endpoint = queue === "leave" ? "/api/manager/leave-requests/" : "/api/manager/attendance-regularizations/";
    await submitAndCapture<{ status: string }>(page, endpoint, "POST", async () => {
      await page.getByRole("button", { name: "Approve request" }).click();
    });
    await expect(page.getByText("Action saved.").first()).toBeVisible();
    await expect(page.getByText("Request approved.").first()).toBeVisible();
    await gotoAuthenticated(page, `/mss/approvals?queue=${queue}`, manager);
  }

  await expectNoHorizontalOverflow(page);
}

async function runProviderLaunchRehearsal(page: Page) {
  await gotoAuthenticated(page, "/hr-admin/payroll-providers");
  await expectPageReady(page, "Payroll Providers");
  await submitAndCapture(page, "/api/hr-admin/payroll-provider-launch-rehearsals/run", "POST", async () => {
    await page.getByRole("button", { name: "Run rehearsal" }).click();
  });
  await expect(page.getByRole("status").filter({ hasText: "Launch rehearsal recorded." })).toBeVisible();
  await expectNoHorizontalOverflow(page);
}

test.describe("Phase 9D launch warning closure", () => {
  test("HR admin and manager close launch warning queues through browser workflows", async ({ page }) => {
    test.setTimeout(10 * 60 * 1000);

    await closeMissingManagerWarnings(page);
    await closeManagerQueue(page, "leave");
    await closeManagerQueue(page, "attendance");
    await runProviderLaunchRehearsal(page);
  });
});
