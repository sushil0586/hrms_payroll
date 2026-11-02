import { expect, test, type Page } from "@playwright/test";

import {
  cleanupIsolatedQaWorkspace,
  provisionIsolatedQaWorkspace,
  workspacePersona,
  type IsolatedQaWorkspace,
} from "../helpers/isolated-qa-workspace";

let workspace: IsolatedQaWorkspace;

test.beforeAll(async ({}, testInfo) => {
  test.setTimeout(180_000);
  workspace = await provisionIsolatedQaWorkspace(testInfo);
});

test.afterAll(async () => {
  await cleanupIsolatedQaWorkspace(workspace);
});

async function login(page: Page, role: "hr_admin" | "hr_checker" = "hr_admin") {
  const user = workspacePersona(workspace, role);
  const response = await page.request.post("/api/auth/login", {
    data: { identifier: user.username, password: user.password },
  });
  expect(response.status()).toBe(200);
}

async function accessToken(page: Page) {
  const token = (await page.context().cookies()).find((cookie) => cookie.name === "hrms_access_token")?.value;
  expect(token).toBeTruthy();
  return token!;
}

async function readBalances(page: Page) {
  const token = await accessToken(page);
  const response = await page.request.get(`${process.env.HRMS_API_BASE_URL}/hr-admin/leave-balances/?page_size=50`, {
    headers: { Authorization: `Token ${token}` },
  });
  expect(response.status()).toBe(200);
  return response.json() as Promise<{ items: Array<{ id: string; closing_balance: string }> }>;
}

test.beforeEach(async ({ page }) => {
  await login(page);
});

test("request Inspect, Close, Review validation, retry, and durable rejection work", async ({ page }) => {
  await page.goto("/hr-admin/leave-requests?status=pending");
  const inspect = page.getByRole("button", { name: /Inspect leave request for/ }).first();
  await inspect.click();
  let detail = page.getByRole("complementary", { name: "Leave request detail", exact: true });
  await expect(detail).toBeVisible();
  await detail.getByRole("button", { name: "Close", exact: true }).click();
  await expect(detail).toHaveCount(0);
  await expect(inspect).toBeFocused();

  await inspect.click();
  detail = page.getByRole("complementary", { name: "Leave request detail", exact: true });
  const review = detail.getByRole("button", { name: "Review", exact: true });
  await review.click();
  let dialog = page.getByRole("dialog", { name: "Review leave request", exact: true });
  const decisionNote = dialog.getByRole("textbox", { name: /Decision note/ });
  await expect(decisionNote).toBeFocused();
  await dialog.getByRole("button", { name: "Reject", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("decision note is required");
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(review).toBeFocused();

  await review.click();
  dialog = page.getByRole("dialog", { name: "Review leave request", exact: true });
  const note = "Synthetic isolated rejection after retry verification";
  await dialog.getByRole("textbox", { name: /Decision note/ }).fill(note);
  await page.route("**/api/hr-admin/leave-requests/*/reject", (route) => route.abort("internetdisconnected"), { times: 1 });
  await dialog.getByRole("button", { name: "Reject", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("Unable to reach the server");
  await expect(dialog.getByRole("textbox", { name: /Decision note/ })).toHaveValue(note);
  const rejection = page.waitForResponse((response) => response.request().method() === "POST" && response.url().endsWith("/reject"));
  await dialog.getByRole("button", { name: "Reject", exact: true }).click();
  expect((await rejection).status()).toBe(200);
  await expect(dialog).toHaveCount(0);
  await expect(detail).toHaveCount(0);
  await expect(page.getByRole("table", { name: "Leave requests", exact: true })).toContainText("No leave requests match the current filters");
  const persisted = await page.request.get(`${process.env.HRMS_API_BASE_URL}/hr-admin/leave-requests/${workspace.manifest.fixtures.leave_request_id}/`, {
    headers: { Authorization: `Token ${await accessToken(page)}` },
  });
  expect(persisted.status()).toBe(200);
  expect((await persisted.json()).status).toBe("rejected");
});

test("balance and transaction drawers restore focus and a validated credit persists once", async ({ page }) => {
  await page.goto("/hr-admin/leave-balances");
  await expect(page.getByRole("complementary", { name: "Leave balance detail", exact: true })).toHaveCount(0);
  await expect(page.getByRole("complementary", { name: "Leave balance transaction detail", exact: true })).toHaveCount(0);
  const balanceInspect = page.getByRole("button", { name: /Inspect balance for/ }).first();
  await balanceInspect.click();
  let balanceDetail = page.getByRole("complementary", { name: "Leave balance detail", exact: true });
  await expect(balanceDetail).toBeVisible();
  await balanceDetail.getByRole("button", { name: "Close", exact: true }).click();
  await expect(balanceDetail).toHaveCount(0);
  await expect(balanceInspect).toBeFocused();

  const transactionInspect = page.getByRole("button", { name: /Inspect transaction for/ }).first();
  await transactionInspect.click();
  const transactionDetail = page.getByRole("complementary", { name: "Leave balance transaction detail", exact: true });
  await expect(transactionDetail).toBeVisible();
  await transactionDetail.getByRole("button", { name: "Close", exact: true }).click();
  await expect(transactionDetail).toHaveCount(0);
  await expect(transactionInspect).toBeFocused();

  const before = (await readBalances(page)).items.find((item) => item.id === workspace.manifest.leave.balance_id);
  expect(before).toBeTruthy();
  await page.getByText("Balance actions", { exact: true }).click();
  const form = page.getByRole("form", { name: "Balance action", exact: true });
  let actionRequests = 0;
  page.on("request", (request) => {
    if (request.method() === "POST" && request.url().endsWith("/api/hr-admin/leave-balances/actions")) actionRequests += 1;
  });
  await form.getByRole("button", { name: "Apply balance action", exact: true }).click();
  await expect(form.getByText("Select the employee whose balance will change.", { exact: true })).toBeVisible();
  await expect(form.getByText("Select the leave policy to adjust.", { exact: true })).toBeVisible();
  await expect(form.getByText("Enter units greater than zero with no more than two decimal places.", { exact: true })).toBeVisible();
  await expect(form.getByText("Select the effective date.", { exact: true })).toBeVisible();
  await expect(form.getByText("Enter a reason for this balance action.", { exact: true })).toBeVisible();
  expect(actionRequests).toBe(0);

  await form.getByRole("combobox", { name: "Employee", exact: true }).selectOption(workspace.manifest.credentials.employee.employee_id);
  await form.getByRole("combobox", { name: "Leave policy", exact: true }).selectOption(workspace.manifest.leave.policy_id);
  await form.getByRole("textbox", { name: "Units", exact: true }).fill("-1");
  await form.getByLabel("Effective date", { exact: true }).fill("2026-10-20");
  await form.getByRole("textbox", { name: "Reason", exact: true }).fill("Synthetic isolated controlled credit");
  await form.getByRole("button", { name: "Apply balance action", exact: true }).click();
  await expect(form.getByText("Enter units greater than zero with no more than two decimal places.", { exact: true })).toBeVisible();

  await form.getByRole("textbox", { name: "Units", exact: true }).fill("1.00");
  const mutation = page.waitForResponse((response) => response.request().method() === "POST" && response.url().endsWith("/api/hr-admin/leave-balances/actions"));
  await form.getByRole("button", { name: "Apply balance action", exact: true }).click();
  expect((await mutation).status()).toBe(200);
  await expect(page.getByText("Balance updated", { exact: true })).toBeVisible();
  await expect.poll(async () => {
    const balance = (await readBalances(page)).items.find((item) => item.id === workspace.manifest.leave.balance_id);
    return Number(balance?.closing_balance);
  }).toBe(Number(before!.closing_balance) + 1);
  await page.reload();
  await expect(page.getByRole("table", { name: "Balance transactions", exact: true })).toContainText("Synthetic isolated controlled credit");
});

test("leave-year validation, durable period creation, and transition cancellation work", async ({ page }) => {
  await page.goto("/hr-admin/leave-year");
  await page.getByLabel("Leave policy", { exact: true }).selectOption(workspace.manifest.leave.policy_id);
  await page.getByLabel("Period code", { exact: true }).fill("QA-ACTIONS-2031");
  await page.getByLabel("Start date", { exact: true }).fill("2031-12-31");
  await page.getByLabel("End date", { exact: true }).fill("2031-01-01");
  await page.getByRole("button", { name: "Create period", exact: true }).click();
  await expect(page.locator("main").getByRole("alert")).toBeVisible();
  await expect(page.getByLabel("Period code", { exact: true })).toHaveValue("QA-ACTIONS-2031");

  await page.getByLabel("Start date", { exact: true }).fill("2031-01-01");
  const create = page.waitForResponse((response) => response.request().method() === "POST" && response.status() === 201 && response.url().includes("/api/hr-admin/leave-year/periods"));
  await page.getByRole("button", { name: "Create period", exact: true }).click();
  expect((await create).status()).toBe(201);
  const periods = page.getByRole("table", { name: "Leave-year periods", exact: true });
  await expect(periods).toContainText("QA-ACTIONS-2031");
  await page.reload();
  await expect(periods).toContainText("QA-ACTIONS-2031");

  const openRow = periods.getByRole("row").filter({ hasText: "2026" }).first();
  const closePeriod = openRow.getByRole("button", { name: "Close period", exact: true });
  await closePeriod.click();
  const dialog = page.getByRole("dialog", { name: "Close leave period", exact: true });
  await expect(dialog.getByLabel("Reason", { exact: true })).toBeFocused();
  await expect(dialog.getByRole("button", { name: "Confirm close", exact: true })).toBeDisabled();
  await dialog.getByLabel("Reason", { exact: true }).fill("Synthetic authorized transition review");
  await expect(dialog.getByRole("button", { name: "Confirm close", exact: true })).toBeEnabled();
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(closePeriod).toBeFocused();
  await expect(openRow).toContainText("open");
});
