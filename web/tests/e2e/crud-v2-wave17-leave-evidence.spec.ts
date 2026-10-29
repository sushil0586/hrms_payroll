import { expect, test } from "@playwright/test";

import {
  cleanupIsolatedQaWorkspace,
  provisionIsolatedQaWorkspace,
  workspacePersona,
  type IsolatedQaWorkspace,
} from "../helpers/isolated-qa-workspace";
import { gotoAuthenticated } from "../helpers/staging-auth";

test("CRUD-05352 CRUD-05357 leave evidence pending state and safe download failure", async ({ page }, testInfo) => {
  let workspace: IsolatedQaWorkspace | undefined;
  try {
    workspace = await provisionIsolatedQaWorkspace(testInfo);
    await gotoAuthenticated(page, "/ess/leave", workspacePersona(workspace, "employee"));
    await page.getByRole("button", { name: "Apply leave", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Apply leave" });
    await expect(dialog).toBeVisible();
    await page.getByLabel("Start date", { exact: true }).fill("2026-11-16");
    await page.getByLabel("End date", { exact: true }).fill("2026-11-16");
    await page.getByLabel("Reason for leave").fill("Wave 17 synthetic attachment feedback");
    await page.getByLabel("Evidence reference").fill("W17-SYNTHETIC");
    await page.getByLabel("Evidence file", { exact: true }).setInputFiles({
      name: "wave17-evidence.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4\n% Wave 17 synthetic evidence\n%%EOF\n"),
    });
    await expect(dialog.getByText("Evidence selected")).toBeVisible();

    let submissions = 0;
    let capturedSubmission: { body: string; status: number } | null = null;
    await page.route("**/api/me/leave-requests", async (route) => {
      if (route.request().method() === "POST") {
        submissions += 1;
        await new Promise((resolve) => setTimeout(resolve, 700));
        const upstream = await route.fetch();
        capturedSubmission = { body: await upstream.text(), status: upstream.status() };
        await route.fulfill({ response: upstream, body: capturedSubmission.body });
        return;
      }
      await route.continue();
    });
    const responsePromise = page.waitForResponse(
      (response) => response.url().endsWith("/api/me/leave-requests") && response.request().method() === "POST",
    );
    await dialog.getByRole("button", { name: "Submit leave", exact: true }).dblclick();
    await expect(dialog.getByRole("button", { name: "Submitting leave" })).toBeDisabled();
    await expect(dialog.getByText("Leave request submitted. Refreshing your history.")).toHaveCount(0);
    const response = await responsePromise;
    expect(response.status()).toBe(201);
    expect(capturedSubmission).not.toBeNull();
    const submission = capturedSubmission as { body: string; status: number } | null;
    if (!submission) throw new Error("The real leave submission response was not captured.");
    expect(submission.status, submission.body).toBe(201);
    const payload = JSON.parse(submission.body);
    expect(payload.id).toEqual(expect.any(String));
    expect(submissions).toBe(1);
    await expect(dialog).toBeHidden();
    await expect(page.getByRole("status").filter({ hasText: "Leave request submitted" })).toBeVisible();

    await page.goto(`/ess/leave?requestId=${payload.id}`);
    const detail = page.getByRole("dialog");
    await expect(detail).toBeVisible();
    const download = detail.getByRole("link", { name: /wave17-evidence\.pdf/i });
    await expect(download).toBeVisible();
    await page.route("**/api/me/leave-requests/*/attachments/*/download", async (route) => {
      await route.fulfill({
        body: JSON.stringify({ detail: "The evidence file is temporarily unavailable. Try again." }),
        contentType: "application/json",
        status: 503,
      });
    });
    await download.click();
    const failure = detail.getByRole("alert");
    await expect(failure).toContainText("temporarily unavailable");
    await expect(page).toHaveURL(new RegExp(`/ess/leave\\?requestId=${payload.id}`));
    await expect(detail.getByText("Leave request submitted. Refreshing your history.")).toHaveCount(0);
  } finally {
    await cleanupIsolatedQaWorkspace(workspace);
  }
});
