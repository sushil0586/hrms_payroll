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

test.afterAll(async () => cleanupIsolatedQaWorkspace(workspace));

async function login(page: Page, role: "employee" | "manager") {
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

async function findRequest(page: Page, reason: string) {
  const response = await page.request.get(`${process.env.HRMS_API_BASE_URL}/me/leave-requests/?q=${encodeURIComponent(reason)}&page_size=20`, {
    headers: { Authorization: `Token ${await accessToken(page)}` },
  });
  expect(response.status()).toBe(200);
  const payload = await response.json() as { items: Array<{ id: string; reason: string; status: string; attachments?: Array<{ file_name: string }> }> };
  const request = payload.items.find((item) => item.reason === reason);
  expect(request).toBeTruthy();
  return request!;
}

async function submitLeave(page: Page, reason: string, date: string, withAttachment = false) {
  await login(page, "employee");
  await page.goto("/ess/leave");
  const apply = page.getByRole("button", { name: "Apply leave", exact: true });
  await apply.click();
  let dialog = page.getByRole("dialog", { name: "Apply leave", exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('select[name="leave_type_id"]')).toBeFocused();
  await dialog.getByRole("button", { name: "Close Apply leave", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(apply).toBeFocused();

  await apply.click();
  dialog = page.getByRole("dialog", { name: "Apply leave", exact: true });
  await dialog.getByLabel("Start date", { exact: true }).fill(date);
  await dialog.getByLabel("End date", { exact: true }).fill(date);
  await dialog.getByRole("button", { name: "Submit leave", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("Review the highlighted leave fields");
  const reasonInput = dialog.locator('textarea[name="reason"]');
  await expect(reasonInput).toBeFocused();
  await reasonInput.fill(reason);
  if (withAttachment) {
    await dialog.locator('input[name="attachment_file"]').setInputFiles({
      name: "synthetic-leave-evidence.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Count 0 >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n"),
    });
    await expect(dialog).toContainText("synthetic-leave-evidence.pdf");
  }
  const submitted = page.waitForResponse((response) => response.request().method() === "POST" && ![301, 302, 307, 308].includes(response.status()) && response.url().includes("/api/me/leave-requests"));
  await dialog.getByRole("button", { name: "Submit leave", exact: true }).click();
  const submittedResponse = await submitted;
  expect(submittedResponse.status(), JSON.stringify(await submittedResponse.json().catch(() => ({})))).toBe(201);
  await expect(dialog).toHaveCount(0);
  return findRequest(page, reason);
}

test("ESS attachment submission and MSS rejection preserve focus, evidence, and durable state", async ({ page }) => {
  const reason = `Synthetic lifecycle rejection ${Date.now()}`;
  const request = await submitLeave(page, reason, "2026-11-20", true);
  expect(request.status).toBe("pending");
  expect(request.attachments?.map((item) => item.file_name)).toContain("synthetic-leave-evidence.pdf");

  await login(page, "manager");
  await page.goto(`/mss/approvals?queue=leave&leaveId=${request.id}`);
  const review = page.getByRole("button", { name: "Review", exact: true }).last();
  await review.click();
  let dialog = page.getByRole("dialog", { name: "Review leave approval", exact: true });
  await expect(dialog).toContainText("synthetic-leave-evidence.pdf");
  const download = page.waitForResponse((response) => response.request().method() === "GET" && response.url().includes("/attachments/") && response.url().endsWith("/download"));
  await dialog.getByRole("link", { name: /synthetic-leave-evidence\.pdf.*Download/ }).click();
  expect((await download).status()).toBe(200);
  await dialog.getByRole("button", { name: "Close Review leave approval", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(review).toBeFocused();

  await review.click();
  dialog = page.getByRole("dialog", { name: "Review leave approval", exact: true });
  await dialog.getByRole("button", { name: "Reject request", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("highlighted decision note");
  const note = dialog.locator("textarea");
  await expect(note).toBeFocused();
  await note.fill("Synthetic manager rejection");
  const rejected = page.waitForResponse((response) => response.request().method() === "POST" && response.url().endsWith(`/leave-requests/${request.id}/reject`));
  await dialog.getByRole("button", { name: "Reject request", exact: true }).click();
  expect((await rejected).status()).toBe(200);
  await expect(dialog).toHaveCount(0);

  await login(page, "employee");
  expect((await findRequest(page, reason)).status).toBe("rejected");
  await page.goto(`/ess/leave?status=rejected&q=${encodeURIComponent(reason)}`);
  const view = page.getByRole("button", { name: /View/ }).first();
  await view.click();
  const detail = page.getByRole("dialog");
  await expect(detail).toContainText("Synthetic manager rejection");
  await page.keyboard.press("Escape");
  await expect(detail).toHaveCount(0);
  await expect(view).toBeFocused();
});

test("approved cancellation governance and pending withdrawal enforce policy without duplicate submission", async ({ page }) => {
  const reason = `Synthetic lifecycle approval ${Date.now()}`;
  const request = await submitLeave(page, reason, "2026-11-23");

  await login(page, "manager");
  await page.goto(`/mss/approvals?queue=leave&leaveId=${request.id}`);
  await page.getByRole("button", { name: "Review", exact: true }).last().click();
  const review = page.getByRole("dialog", { name: "Review leave approval", exact: true });
  await review.getByRole("textbox", { name: "Decision note", exact: true }).fill("Synthetic manager approval");
  const approved = page.waitForResponse((response) => response.request().method() === "POST" && response.url().endsWith(`/leave-requests/${request.id}/approve`));
  await review.getByRole("button", { name: "Approve request", exact: true }).click();
  expect((await approved).status()).toBe(200);

  await login(page, "employee");
  await page.goto(`/ess/leave?status=approved&q=${encodeURIComponent(reason)}`);
  await page.getByRole("button", { name: /View/ }).first().click();
  const detail = page.getByRole("dialog");
  await expect(detail).toContainText("Synthetic manager approval");
  await expect(detail).toContainText("Cancel unavailable");
  await expect(detail).toContainText("does not allow employee cancellation after approval");
  await page.keyboard.press("Escape");

  const withdrawalReason = `Synthetic lifecycle withdrawal ${Date.now()}`;
  const pending = await submitLeave(page, withdrawalReason, "2026-11-24");
  await page.goto(`/ess/leave?status=pending&q=${encodeURIComponent(withdrawalReason)}`);
  await page.getByRole("button", { name: /View/ }).first().click();
  const pendingDetail = page.getByRole("dialog");
  const withdraw = pendingDetail.getByRole("button", { name: "Withdraw request", exact: true });
  await withdraw.click();
  await expect(pendingDetail.getByRole("alert")).toContainText("highlighted evidence fields");
  const evidenceReference = pendingDetail.locator(".leave-lifecycle-panel input").nth(1);
  await evidenceReference.fill("Synthetic withdrawal evidence reference");
  const evidenceFile = pendingDetail.locator('input[type="file"]');
  await evidenceFile.setInputFiles({
    name: "blocked-withdrawal.exe",
    mimeType: "application/x-msdownload",
    buffer: Buffer.from("synthetic blocked executable"),
  });
  await withdraw.click();
  await expect(pendingDetail.getByText("This file type is not allowed for leave evidence. Choose a document or image.", { exact: true })).toBeVisible();
  await expect(pendingDetail.getByRole("status").filter({ hasText: "Leave request withdrawn" })).toHaveCount(0);
  expect((await findRequest(page, withdrawalReason)).status).toBe("pending");

  await evidenceFile.setInputFiles({
    name: "spoofed-withdrawal.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("not a PDF"),
  });
  const rejectedUpload = page.waitForResponse((response) => response.request().method() === "POST"
    && response.url().includes(`/leave-requests/${pending.id}/withdraw`)
    && ![301, 302, 307, 308].includes(response.status()));
  await withdraw.click();
  expect((await rejectedUpload).status()).toBe(400);
  await expect(pendingDetail.getByRole("alert")).toContainText("content does not match its filename");
  await expect(pendingDetail.getByRole("status").filter({ hasText: "Leave request withdrawn" })).toHaveCount(0);
  expect((await findRequest(page, withdrawalReason)).status).toBe("pending");

  await evidenceFile.setInputFiles({
    name: "valid-withdrawal.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4\nsynthetic withdrawal evidence\n%%EOF\n"),
  });
  let writes = 0;
  page.on("response", (item) => {
    if (item.request().method() === "POST" && item.status() === 200 && item.url().includes(`/leave-requests/${pending.id}/withdraw`)) writes += 1;
  });
  const withdrawn = page.waitForResponse((response) => response.request().method() === "POST" && response.status() === 200 && response.url().includes(`/leave-requests/${pending.id}/withdraw`));
  await Promise.all([withdraw.click(), withdraw.click()]);
  expect((await withdrawn).status()).toBe(200);
  expect(writes).toBe(1);
  expect((await findRequest(page, withdrawalReason)).status).toBe("withdrawn");
});
