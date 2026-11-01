import { expect, test, type Page } from "@playwright/test";

import {
  cleanupIsolatedQaWorkspace,
  provisionIsolatedQaWorkspace,
  type IsolatedQaWorkspace,
  workspacePersona,
} from "../helpers/isolated-qa-workspace";

test.describe.configure({ mode: "serial" });

let workspace: IsolatedQaWorkspace;

async function login(page: Page) {
  const manager = workspacePersona(workspace, "manager");
  await page.goto("/login");
  await page.getByLabel("Username or email").fill(manager.username);
  await page.getByLabel("Password").fill(manager.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

async function expectNoDocumentOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
}

test.beforeAll(async ({}, testInfo) => {
  workspace = await provisionIsolatedQaWorkspace(testInfo);
});

test.afterAll(async () => cleanupIsolatedQaWorkspace(workspace));

test("records a browser decision and exposes truthful filterable history", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(String(error)));
  await login(page);
  await page.goto(`/mss/approvals?queue=leave&leaveId=${workspace.manifest.fixtures.leave_request_id}`);

  const review = page.locator(".mss-selected-review-band").getByRole("button", { name: "Review" });
  await expect(review).toBeVisible();
  await review.click();
  const dialog = page.getByRole("dialog", { name: /Review leave approval/ });
  await dialog.getByLabel("Decision note").fill("History certification rejection");
  await dialog.getByRole("button", { name: /Reject request/ }).click();
  await expect(dialog).toHaveCount(0);

  await page.goto("/mss/approvals?queue=history");
  const leaveTable = page.getByRole("table", { name: "Completed leave decisions" });
  await expect(leaveTable).toBeVisible();
  await expect(leaveTable.getByText("reject", { exact: true })).toBeVisible();
  await expect(leaveTable.getByText("rejected", { exact: true })).toBeVisible();
  await expect(page.getByRole("form", { name: "Decision history filters" })).toBeVisible();

  const filter = page.getByRole("form", { name: "Decision history filters" });
  await filter.getByLabel("Employee").fill(workspace.manifest.credentials.employee.employee_code);
  await filter.getByLabel("Your decision").selectOption("reject");
  await filter.getByLabel("Current status").selectOption("rejected");
  await filter.getByRole("button", { name: "Apply filters" }).click();
  await expect(page).toHaveURL(/historyDecision=reject/);
  await expect(page).toHaveURL(/historyStatus=rejected/);
  await expect(leaveTable.getByText(workspace.manifest.credentials.employee.employee_code, { exact: true })).toBeVisible();

  await page.reload();
  await expect(filter.getByLabel("Your decision")).toHaveValue("reject");
  await expect(filter.getByLabel("Current status")).toHaveValue("rejected");
  expect(pageErrors).toEqual([]);
});

test("contains history tables on mobile and supports keyboard scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  await page.goto("/mss/approvals?queue=history");
  await expectNoDocumentOverflow(page);

  const leaveRegion = page.getByRole("region", { name: "Completed leave decisions" });
  await leaveRegion.focus();
  await expect(leaveRegion).toBeFocused();
  const before = await leaveRegion.evaluate((element) => element.scrollLeft);
  await page.keyboard.press("ArrowRight");
  const after = await leaveRegion.evaluate((element) => element.scrollLeft);
  expect(after).toBeGreaterThan(before);
});
