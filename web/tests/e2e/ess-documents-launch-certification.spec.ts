import { expect, test, type Locator, type Page } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { expectDialogStable } from "../helpers/modal-stability";
import { employee, gotoAuthenticated } from "../helpers/staging-auth";

function field(scope: Page | Locator, label: string) {
  return scope.locator("label.form-field").filter({ hasText: label }).locator("input, select, textarea").first();
}

async function openUploadDialog(page: Page) {
  const uploadButton = page.getByRole("button", { name: "Upload document" }).first();
  await expect(uploadButton).toBeVisible();
  test.skip(await uploadButton.isDisabled(), "No employee upload category is available in this tenant.");
  await uploadButton.click();
  const dialog = page.getByRole("dialog", { name: "Upload document" });
  await expect(dialog).toBeVisible();
  return dialog;
}

test.describe("ESS Documents launch certification", () => {
  test("documents page keeps status, guidance, and history separate from the upload form", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await gotoAuthenticated(page, "/ess/documents", employee);
    await expectPageReady(page, "Documents");

    for (const metric of ["Required documents", "Missing now", "Expiring soon", "Expired"]) {
      await expect(page.locator(".metric-tile").filter({ hasText: metric }).first()).toBeVisible();
    }

    for (const readinessItem of ["Missing uploads", "Returned by HR", "Expiry focus", "HR review"]) {
      await expect(page.locator(".ess-documents-readiness-band").getByText(readinessItem, { exact: true })).toBeVisible();
    }

    await expect(page.getByRole("heading", { name: "Required documents" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Before sending a file" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Document history" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Upload required document" })).toHaveCount(0);
    await expect(page.getByLabel("File")).toHaveCount(0);

    for (const checklistItem of ["Clear file", "Correct category", "Expiry date", "Re-upload note"]) {
      await expect(page.getByText(checklistItem, { exact: true })).toBeVisible();
    }

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/ess/documents", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
    await expectPageReady(page, "Documents");
    await expect(page.getByRole("heading", { name: "Required documents" })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("upload dialog validates required fields and submits through the browser", async ({ page }) => {
    await gotoAuthenticated(page, "/ess/documents", employee);
    await expectPageReady(page, "Documents");

    const dialog = await openUploadDialog(page);
    await expectDialogStable(page, "Upload document");
    await expect(dialog.getByRole("button", { name: "Submit for review" })).toBeDisabled();

    await field(dialog, "Title").fill(`Playwright document ${Date.now()}`);
    await expect(dialog.getByRole("button", { name: "Submit for review" })).toBeDisabled();

    await field(dialog, "Document number").fill("PW-DOC-001");
    await field(dialog, "Issued on").fill("2026-10-01");
    await field(dialog, "Expires on").fill("2027-10-01");
    await field(dialog, "File").setInputFiles({
      name: "playwright-document.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4\n% Playwright document\n%%EOF\n"),
    });
    await expect(dialog.getByRole("button", { name: "Submit for review" })).toBeEnabled();

    let uploadAttempt = 0;
    await page.route("**/api/me/employee-documents", async (route) => {
      uploadAttempt += 1;
      if (uploadAttempt === 1) {
        await route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({ file: ["Uploaded file could not be scanned. Try another PDF."] }),
        });
        return;
      }
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ id: "playwright-document", verification_status: "pending" }),
      });
    });

    await dialog.getByRole("button", { name: "Submit for review" }).click();
    await expect(dialog.getByText("Upload failed.")).toBeVisible();
    await expect(dialog.getByText("Uploaded file could not be scanned. Try another PDF.")).toBeVisible();
    await expectDialogStable(page, "Upload document");
    await dialog.getByRole("button", { name: "Submit for review" }).click();
    await expect(dialog.getByText("Upload submitted.")).toBeVisible();
    await expect(dialog.getByText("Your document has been sent to HR for verification.")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
  });

  test("document history supports filters, pagination, download links, and detail drilldown", async ({ page }) => {
    await gotoAuthenticated(page, "/ess/documents", employee);
    await expectPageReady(page, "Documents");

    for (const label of ["Search", "Verification", "Category", "Expiry focus", "Rows per page"]) {
      await expect(page.getByLabel(label).last(), `${label} filter should be available`).toBeVisible();
    }
    await expect(page.getByRole("button", { name: "Apply filters" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Clear filters" })).toBeVisible();
    await expect(page.locator(".pagination-bar").first()).toBeVisible();

    const reviewButton = page.getByRole("button", { name: "Review" }).first();
    if (await reviewButton.isVisible().catch(() => false)) {
      await reviewButton.click();
      const detail = page.getByRole("dialog", { name: "Document detail" });
      await expect(detail).toBeVisible();
      await expect(detail.getByText("Review status")).toBeVisible();
      await expect(detail.getByText("Audit trail")).toBeVisible();
      await expectDialogStable(page, "Document detail");
      await page.keyboard.press("Escape");
      await expect(detail).toHaveCount(0);
    }

    const download = page.getByRole("link", { name: /Download|Download file/ }).first();
    if (await download.isVisible().catch(() => false)) {
      await expect(download).toHaveAttribute("href", /\/api\/me\/employee-documents\/.+\/download/);
    }
    await expectNoHorizontalOverflow(page);
  });

  test("document dialogs remain stable on compact screens", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoAuthenticated(page, "/ess/documents", employee);
    await expectPageReady(page, "Documents");

    const uploadDialog = await openUploadDialog(page);
    await expectDialogStable(page, "Upload document");
    await uploadDialog.getByRole("button", { name: "Close" }).click();

    const reviewButton = page.getByRole("button", { name: "Review" }).first();
    if (await reviewButton.isVisible().catch(() => false)) {
      await reviewButton.click();
      await expectDialogStable(page, "Document detail");
    }
  });
});
