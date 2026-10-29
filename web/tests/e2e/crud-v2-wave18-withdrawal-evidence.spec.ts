import { expect, test } from "@playwright/test";

import {
  cleanupIsolatedQaWorkspace,
  provisionIsolatedQaWorkspace,
  workspacePersona,
  type IsolatedQaWorkspace,
} from "../helpers/isolated-qa-workspace";
import { gotoAuthenticated } from "../helpers/staging-auth";

test("ATT-004 withdrawal evidence feedback is truthful, recoverable, and idempotent", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  let workspace: IsolatedQaWorkspace | undefined;
  try {
    workspace = await provisionIsolatedQaWorkspace(testInfo);
    const requestId = workspace.manifest.fixtures.leave_request_id;
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoAuthenticated(page, `/ess/leave?requestId=${requestId}`, workspacePersona(workspace, "employee"));

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Withdraw request", exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(dialog.getByRole("alert")).toContainText("Review the highlighted evidence fields");
    await expect(dialog.getByText("Upload evidence or enter an evidence reference before submitting this action.")).toBeVisible();

    const fileInput = dialog.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: "unsafe.exe",
      mimeType: "application/x-msdownload",
      buffer: Buffer.from("synthetic blocked executable"),
    });
    await dialog.getByRole("button", { name: "Withdraw request", exact: true }).click();
    await expect(dialog.getByText("This file type is not allowed for leave evidence. Choose a document or image.")).toBeVisible();

    const evidence = Buffer.from("%PDF-1.4\n% Wave 18 synthetic withdrawal evidence\n%%EOF\n");
    await fileInput.setInputFiles({ name: "wave18-withdrawal.pdf", mimeType: "application/pdf", buffer: evidence });
    await expect(dialog.getByRole("status")).toContainText("wave18-withdrawal.pdf");
    await expect(dialog.getByRole("status")).toContainText(`${evidence.length} B`);
    await expect(dialog.getByText("Evidence selected", { exact: true })).toBeVisible();
    await dialog.getByLabel("Reason", { exact: true }).fill("Wave 18 synthetic withdrawal");

    let controlledFailures = 0;
    await page.route(`**/api/me/leave-requests/${requestId}/withdraw/`, async (route) => {
      controlledFailures += 1;
      await new Promise((resolve) => setTimeout(resolve, 350));
      await route.fulfill({
        body: JSON.stringify({ detail: "Synthetic storage service is temporarily unavailable. Retry this withdrawal." }),
        contentType: "application/json",
        status: 503,
      });
    }, { times: 1 });

    await dialog.getByRole("button", { name: "Withdraw request", exact: true }).click();
    await expect(dialog.getByRole("button", { name: "Withdrawing request" })).toBeDisabled();
    await expect(dialog.getByRole("status").filter({ hasText: "Action saved" })).toHaveCount(0);
    await expect(dialog.getByRole("alert")).toContainText("We could not confirm the outcome. Check the latest records before trying again to avoid submitting twice.");
    await expect(dialog).toBeVisible();
    expect(controlledFailures).toBe(1);

    let realSubmissions = 0;
    let idempotencyKey = "";
    await page.route(`**/api/me/leave-requests/${requestId}/withdraw/`, async (route) => {
      realSubmissions += 1;
      idempotencyKey = route.request().headers()["idempotency-key"] ?? "";
      await new Promise((resolve) => setTimeout(resolve, 500));
      await route.continue();
    });
    const responsePromise = page.waitForResponse(
      (response) => response.url().includes(`${requestId}/withdraw`) && response.request().method() === "POST" && response.status() === 200,
    );
    await dialog.getByRole("button", { name: "Withdraw request", exact: true }).dblclick();
    await expect(dialog.getByRole("button", { name: "Withdrawing request" })).toBeDisabled();
    const response = await responsePromise;
    expect(response.status()).toBe(200);
    expect(idempotencyKey).toMatch(/^leave-withdraw:/);
    expect(realSubmissions).toBe(1);
    await expect(dialog).toBeHidden();
    await expect(page.getByRole("status").filter({ hasText: "Leave request withdrawn" })).toBeVisible();

    await page.reload();
    const row = page.getByRole("table", { name: "Leave request history" }).getByRole("row").filter({ hasText: "withdrawn" });
    await expect(row).toHaveCount(1);
  } finally {
    await cleanupIsolatedQaWorkspace(workspace);
  }
});
