import { expect, test, type Locator, type Page } from "@playwright/test";

import { expectNoAppError, expectNoHorizontalOverflow, expectPageReady, suppressBrowserTestNoise } from "../helpers/assertions";

function field(scope: Page | Locator, label: string) {
  return scope.locator("label.form-field").filter({ hasText: label }).locator("input, select, textarea").first();
}

async function gotoEssDemo(page: Page, path: string) {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const origin = new URL(page.url()).origin;
  await page.context().addCookies([
    {
      name: "hrms_access_token",
      value: "playwright-demo-token",
      url: origin,
    },
  ]);
  await page.goto(path, { waitUntil: "networkidle" });
}

test.describe("ESS frontend validation", () => {
  test("leave request blocks missing reason before calling the API", async ({ page }) => {
    let leaveCalls = 0;
    await page.route("**/api/me/leave-requests", async (route) => {
      leaveCalls += 1;
      await route.fulfill({ status: 500, contentType: "application/json", body: "{}" });
    });

    await gotoEssDemo(page, "/ess/leave");
    await suppressBrowserTestNoise(page);
    await expectPageReady(page, "Leave");

    await page.getByRole("button", { name: "Apply leave" }).click();
    const dialog = page.getByRole("dialog", { name: "Apply leave" });
    await expect(dialog).toBeVisible();

    const submit = dialog.getByRole("button", { name: "Submit leave" });
    test.skip(await submit.isDisabled(), "No submittable leave type is available for this tenant.");

    await submit.click();

    await expect(dialog.getByRole("alert").filter({ hasText: "Enter the reason for this leave request." })).toBeVisible();
    await expect(field(dialog, "Reason for leave")).toHaveAttribute("aria-invalid", "true");
    expect(leaveCalls).toBe(0);
    await expectNoAppError(page);
    await expectNoHorizontalOverflow(page);
  });

  test("leave request preview does not deduct calendar days before policy submit checks", async ({ page }) => {
    await gotoEssDemo(page, "/ess/leave");
    await suppressBrowserTestNoise(page);
    await expectPageReady(page, "Leave");

    await page.getByRole("button", { name: "Apply leave" }).click();
    const dialog = page.getByRole("dialog", { name: "Apply leave" });
    await expect(dialog).toBeVisible();

    await field(dialog, "Start date").fill("2026-10-16");
    await field(dialog, "End date").fill("2026-10-19");

    await expect(dialog.getByText("4 calendar days selected")).toBeVisible();
    const balanceAfter = dialog.locator(".detail-row").filter({ hasText: "Balance after request" });
    await expect(balanceAfter).toContainText("Checked on submit");
    await expect(balanceAfter).not.toContainText("1");
    await expectNoAppError(page);
    await expectNoHorizontalOverflow(page);
  });

  test("attendance regularization blocks frontend errors before calling the API", async ({ page }) => {
    let regularizationCalls = 0;
    await page.route("**/api/me/attendance-regularizations", async (route) => {
      regularizationCalls += 1;
      await route.fulfill({ status: 500, contentType: "application/json", body: "{}" });
    });

    await gotoEssDemo(page, "/ess/attendance");
    await suppressBrowserTestNoise(page);
    await expectPageReady(page, "Attendance");

    await page.getByRole("button", { name: "Regularize attendance" }).click();
    const dialog = page.getByRole("dialog", { name: "Regularize attendance" });
    await expect(dialog).toBeVisible();

    const submit = dialog.getByRole("button", { name: "Submit correction" });
    test.skip(await submit.isDisabled(), "No editable attendance record is available for this tenant.");

    await submit.click();

    await expect(dialog.getByRole("alert").filter({ hasText: "Enter the reason for this attendance correction." })).toBeVisible();
    await expect(field(dialog, "Reason")).toHaveAttribute("aria-invalid", "true");
    expect(regularizationCalls).toBe(0);

    await field(dialog, "Requested check-in").fill("2026-10-07T18:00");
    await field(dialog, "Requested check-out").fill("2026-10-07T09:00");
    await field(dialog, "Reason").fill("Correcting missed punch from the mobile app.");
    await submit.click();

    await expect(dialog.getByRole("alert").filter({ hasText: "Requested check-out cannot be earlier than requested check-in." })).toBeVisible();
    await expect(field(dialog, "Requested check-out")).toHaveAttribute("aria-invalid", "true");
    expect(regularizationCalls).toBe(0);
    await expectNoAppError(page);
    await expectNoHorizontalOverflow(page);
  });

  test("statutory declarations block declaration and proof validation before calling APIs", async ({ page }) => {
    let declarationCalls = 0;
    let proofCalls = 0;
    await page.route("**/api/me/statutory-declarations", async (route) => {
      declarationCalls += 1;
      await route.fulfill({ status: 500, contentType: "application/json", body: "{}" });
    });
    await page.route("**/api/me/statutory-declarations/*/items", async (route) => {
      proofCalls += 1;
      await route.fulfill({ status: 500, contentType: "application/json", body: "{}" });
    });
    await page.route("**/api/me/statutory-declarations/*/proof-upload", async (route) => {
      proofCalls += 1;
      await route.fulfill({ status: 500, contentType: "application/json", body: "{}" });
    });

    await gotoEssDemo(page, "/ess/statutory-declarations");
    await suppressBrowserTestNoise(page);
    await expectPageReady(page, "Statutory Declarations");

    await page.getByRole("button", { name: /Start declaration|Update declaration|View setup/ }).click();
    const declarationDialog = page.getByRole("dialog", { name: /Start declaration|Update declaration/ });
    await expect(declarationDialog).toBeVisible();
    await field(declarationDialog, "Financial year").fill("");
    await declarationDialog.getByRole("button", { name: /Create declaration|Update declaration/ }).click();

    await expect(declarationDialog.getByRole("alert").filter({ hasText: "Enter the financial year for this declaration." })).toBeVisible();
    await expect(field(declarationDialog, "Financial year")).toHaveAttribute("aria-invalid", "true");
    expect(declarationCalls).toBe(0);

    await declarationDialog.getByRole("button", { name: "Close" }).click();
    const addProof = page.getByRole("button", { name: "Add proof" });
    if (await addProof.isDisabled()) {
      await expectNoAppError(page);
      await expectNoHorizontalOverflow(page);
      return;
    }

    await addProof.click();
    const proofDialog = page.getByRole("dialog", { name: "Add proof" });
    await expect(proofDialog).toBeVisible();
    await proofDialog.getByRole("button", { name: "Add proof" }).click();

    await expect(proofDialog.getByRole("alert").filter({ hasText: "Enter a clear proof item name." })).toBeVisible();
    await expect(proofDialog.getByRole("alert").filter({ hasText: "Enter the declared amount for this proof item." })).toBeVisible();
    await expect(field(proofDialog, "Item name")).toHaveAttribute("aria-invalid", "true");
    await expect(field(proofDialog, "Amount")).toHaveAttribute("aria-invalid", "true");
    expect(proofCalls).toBe(0);
    await expectNoAppError(page);
    await expectNoHorizontalOverflow(page);
  });
});
