import { expect, test, type Page } from "@playwright/test";

import {
  cleanupIsolatedQaWorkspace,
  provisionIsolatedQaWorkspace,
  workspacePersona,
  type IsolatedQaWorkspace,
} from "../helpers/isolated-qa-workspace";

let workspace: IsolatedQaWorkspace;

test.describe.configure({ mode: "serial" });

test.beforeAll(async ({}, testInfo) => {
  test.setTimeout(180_000);
  workspace = await provisionIsolatedQaWorkspace(testInfo);
});

test.afterAll(async () => cleanupIsolatedQaWorkspace(workspace));

async function login(page: Page, role: "employee" | "manager" | "hr_admin") {
  const actor = workspacePersona(workspace, role);
  const response = await page.request.post("/api/auth/login", {
    data: { identifier: actor.username, password: actor.password },
  });
  expect(response.status()).toBe(200);
}

async function accessToken(page: Page) {
  const token = (await page.context().cookies()).find((cookie) => cookie.name === "hrms_access_token")?.value;
  expect(token).toBeTruthy();
  return token!;
}

async function employeeRegularizations(page: Page) {
  const response = await page.request.get(`${process.env.HRMS_API_BASE_URL}/me/attendance-regularizations/?page_size=50`, {
    headers: { Authorization: `Token ${await accessToken(page)}` },
  });
  expect(response.status()).toBe(200);
  return await response.json() as { items: Array<{ id: string; reason: string; status: string }> };
}

test("HR attendance record and regularization drawers restore their Inspect trigger", async ({ page }) => {
  await login(page, "hr_admin");

  await page.goto("/hr-admin/attendance-records");
  let inspect = page.getByRole("button", { name: "Inspect", exact: true }).first();
  await inspect.click();
  const recordDetail = page.getByRole("complementary", { name: "Attendance record detail", exact: true });
  await expect(recordDetail).toBeVisible();
  await recordDetail.getByRole("button", { name: "Close", exact: true }).click();
  await expect(recordDetail).toHaveCount(0);
  await expect(inspect).toBeFocused();

  await inspect.click();
  const edit = recordDetail.getByRole("button", { name: "Edit record", exact: true });
  await edit.click();
  const editDialog = page.getByRole("dialog", { name: /^Edit / });
  await expect(editDialog).toBeVisible();
  await editDialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(editDialog).toHaveCount(0);
  await expect(edit).toBeFocused();

  await page.goto("/hr-admin/attendance-regularizations");
  inspect = page.getByRole("button", { name: "Inspect", exact: true }).first();
  await inspect.click();
  const requestDetail = page.locator("article.attendance-detail-drawer");
  await expect(requestDetail).toBeVisible();
  await requestDetail.getByRole("button", { name: "Close", exact: true }).click();
  await expect(page.getByText("Regularization detail", { exact: true })).toHaveCount(0);
  await expect(inspect).toBeFocused();
});

test("MSS review validates the note, resolves the seeded request, and restores focus", async ({ page }) => {
  await login(page, "manager");
  const itemId = workspace.manifest.fixtures.attendance_regularization_id;
  await page.goto(`/mss/approvals?queue=attendance&attendanceId=${itemId}`);
  const review = page.getByRole("button", { name: "Review", exact: true }).last();
  await review.click();
  let dialog = page.getByRole("dialog", { name: "Review attendance approval", exact: true });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Close Review attendance approval", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(review).toBeFocused();

  await review.click();
  dialog = page.getByRole("dialog", { name: "Review attendance approval", exact: true });
  await dialog.getByRole("button", { name: "Reject request", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("highlighted decision note");
  const note = dialog.locator("textarea");
  await expect(note).toBeFocused();
  await note.fill("Synthetic attendance correction rejected for lifecycle verification");
  const rejected = page.waitForResponse((response) => response.request().method() === "POST" && response.url().endsWith(`/attendance-regularizations/${itemId}/reject`));
  await dialog.getByRole("button", { name: "Reject request", exact: true }).click();
  expect((await rejected).status()).toBe(200);
  await expect(dialog).toHaveCount(0);
});

test("ESS correction validates time order, submits once, persists, and restores focus", async ({ page }) => {
  await login(page, "employee");
  await page.goto("/ess/attendance?month=2026-10");
  const trigger = page.getByRole("button", { name: "Regularize attendance", exact: true });
  await trigger.click();
  let dialog = page.getByRole("dialog", { name: "Regularize attendance", exact: true });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Close Regularize attendance", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();

  await trigger.click();
  dialog = page.getByRole("dialog", { name: "Regularize attendance", exact: true });
  await dialog.locator('textarea[name="reason"]').fill("Synthetic attendance correction lifecycle");
  await dialog.locator('input[name="requested_check_in_at"]').fill("2026-10-15T18:00");
  await dialog.locator('input[name="requested_check_out_at"]').fill("2026-10-15T09:00");
  await expect(dialog).toContainText("Requested check-out is earlier than requested check-in");
  await expect(dialog.getByRole("button", { name: "Submit correction", exact: true })).toBeDisabled();

  await dialog.locator('input[name="requested_check_in_at"]').fill("2026-10-15T09:00");
  await dialog.locator('input[name="requested_check_out_at"]').fill("2026-10-15T18:00");
  let successfulWrites = 0;
  page.on("response", (response) => {
    if (response.request().method() === "POST" && response.status() === 201 && response.url().includes("/api/me/attendance-regularizations")) successfulWrites += 1;
  });
  const submitted = page.waitForResponse((response) => response.request().method() === "POST" && response.url().includes("/api/me/attendance-regularizations"));
  await Promise.all([
    dialog.getByRole("button", { name: "Submit correction", exact: true }).click(),
    dialog.getByRole("button", { name: "Submit correction", exact: true }).click(),
  ]);
  expect((await submitted).status()).toBe(201);
  expect(successfulWrites).toBe(1);
  await expect(dialog).toHaveCount(0);
  const submittedStatus = page.locator('[role="status"]', { hasText: "Attendance regularization submitted" });
  await expect(submittedStatus).toBeFocused();

  const payload = await employeeRegularizations(page);
  const request = payload.items.find((item) => item.reason === "Synthetic attendance correction lifecycle");
  expect(request?.status).toBe("pending");
  await page.reload();
  await expect(page.getByRole("table", { name: "Attendance regularization history", exact: true })).toContainText("Pending");
});
