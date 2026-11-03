import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated, type Persona } from "../helpers/staging-auth";

const password = process.env.PLAYWRIGHT_LIVE_SEED_PASSWORD ?? "Password@123";
const employee: Persona = {
  username: process.env.PLAYWRIGHT_LIVE_EMPLOYEE_USERNAME ?? "pw_statutory_phase5_employee",
  password,
};
const hrAdmin: Persona = {
  username: process.env.PLAYWRIGHT_LIVE_HR_ADMIN_USERNAME ?? "pw_statutory_phase5_hr_admin",
  password,
};
const finance: Persona = {
  username: process.env.PLAYWRIGHT_LIVE_PAYROLL_FINANCE_USERNAME ?? "pw_statutory_phase5_finance",
  password,
};

test.describe("Statutory Phase 5 connected certification", () => {
  test.describe.configure({ mode: "serial" });
  test.setTimeout(180_000);

  test("ESS submits private proof and HR verifies and locks the declaration", async ({ page }) => {
    await gotoAuthenticated(page, "/ess/statutory-declarations", employee);
    await expectPageReady(page, "Statutory Declarations");

    await page.getByRole("button", { name: /Update declaration|Start declaration/ }).first().click();
    const declarationDialog = page.getByRole("dialog", { name: /Update declaration|Start declaration/ });
    await declarationDialog.getByLabel("Financial year").selectOption({ index: 1 });
    await declarationDialog.getByLabel("Tax regime").selectOption("old");
    await declarationDialog.getByRole("button", { name: "Update declaration", exact: true }).click();
    await expect(page.getByText("Declaration saved.", { exact: true }).first()).toBeVisible();

    await page.getByRole("button", { name: "Add proof", exact: true }).first().click();
    const proofDialog = page.getByRole("dialog", { name: "Add proof" });
    await proofDialog.getByLabel("Section").selectOption("80C");
    await proofDialog.getByLabel("Kind").selectOption("investment");
    await proofDialog.getByLabel("Component").selectOption("LIC");
    await proofDialog.getByLabel("Item name").fill("Phase 5 synthetic LIC proof");
    await proofDialog.getByLabel("Amount").fill("12500");
    await proofDialog.getByLabel("Upload category").selectOption({ index: 1 });
    await proofDialog.getByLabel("Proof file").setInputFiles({
      name: "phase5-synthetic-proof.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4\n% synthetic statutory proof only\n"),
    });
    await proofDialog.getByRole("button", { name: "Upload proof" }).click();
    await expect(page.getByText("Proof file uploaded and linked.", { exact: true }).first()).toBeVisible();

    await page.getByRole("button", { name: "Submit declaration", exact: true }).first().click();
    const submitDialog = page.getByRole("dialog", { name: "Submit declaration" });
    await submitDialog.getByRole("button", { name: "Submit declaration", exact: true }).click();
    await expect(page.getByText("Declaration submitted.", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Submitted", { exact: true }).first()).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await gotoAuthenticated(page, "/hr-admin/payroll-statutory?tab=declarations", hrAdmin);
    await expectPageReady(page, "Statutory Compliance");
    const declarationLink = page.locator("main a[href*='declarationId=']").first();
    if (await declarationLink.isVisible().catch(() => false)) await declarationLink.click();
    await expect(page.getByRole("heading", { name: "Review submitted evidence" })).toBeVisible();
    await expect(page.getByText("Phase 5 synthetic LIC proof", { exact: true }).first()).toBeVisible();

    await page.getByRole("button", { name: "Verify proof" }).click();
    await expect(page.getByText("Proof verification completed.", { exact: true })).toBeVisible();
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Verify declaration" }).click();
    await expect(page.getByText("Declaration verification completed.", { exact: true })).toBeVisible();
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Lock for payroll" }).click();
    await expect(page.getByText("Declaration lock completed.", { exact: true })).toBeVisible();
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByText("Locked", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Audit timeline", { exact: true })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("Finance sees and exports only pseudonymous locked reconciliation", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/payroll-statutory?tab=declarations", finance);
    await expectPageReady(page, "Statutory Compliance");
    await expect(page.getByRole("heading", { name: "Locked statutory totals" })).toBeVisible();
    await expect(page.getByText("Finance reconciliation boundary", { exact: true })).toBeVisible();
    await expect(page.getByText("QA-EMP-001", { exact: false })).toHaveCount(0);
    await expect(page.getByText(/Declaration [a-f0-9]{12}/).first()).toBeVisible();

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export locked reconciliation" }).click();
    const download = await downloadPromise;
    const stream = await download.createReadStream();
    let csv = "";
    for await (const chunk of stream) csv += chunk.toString();
    expect(csv).toContain("declaration_reference");
    expect(csv).toContain("verified_total");
    expect(csv).toContain("source_hash");
    expect(csv).not.toContain("QA-EMP-001");
    expect(csv).not.toContain("phase5-synthetic-proof.pdf");
    await expectNoHorizontalOverflow(page);
  });

  test("Payroll Approval reopens and ESS replaces proof before governed relock", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/payroll-statutory?tab=declarations", hrAdmin);
    await expectPageReady(page, "Statutory Compliance");
    const declarationLink = page.locator("main a[href*='declarationId=']").first();
    if (await declarationLink.isVisible().catch(() => false)) await declarationLink.click();

    const reopenButton = page.getByRole("button", { name: "Reopen for correction" });
    if (await reopenButton.isVisible().catch(() => false)) {
      await page.getByLabel("Reopen reason").fill("Employee supplied a corrected synthetic LIC receipt.");
      await page.getByLabel("Approval reference").fill("PHASE6-LOCAL-001");
      await reopenButton.click();
      await expect(page.getByText("Declaration reopening completed.", { exact: true })).toBeVisible();
    } else {
      await expect(page.getByText("Rejected", { exact: true }).first()).toBeVisible();
    }

    await gotoAuthenticated(page, "/ess/statutory-declarations", employee);
    await expectPageReady(page, "Statutory Declarations");
    await expect(page.getByText("Rejected", { exact: true }).first()).toBeVisible();
    await page.getByRole("button", { name: "View details" }).first().click();
    const detailDialog = page.getByRole("dialog", { name: "Proof detail" });
    await detailDialog.getByRole("button", { name: "Replace proof" }).click();
    const replacementDialog = page.getByRole("dialog", { name: "Replace proof" });
    await replacementDialog.getByLabel("Proof file").setInputFiles({
      name: "phase6-corrected-synthetic-proof.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4\n% corrected synthetic statutory proof only\n"),
    });
    await replacementDialog.getByRole("button", { name: "Replace proof", exact: true }).click();
    await expect(page.getByText("Proof replaced and linked to the existing declaration item.", { exact: true }).first()).toBeVisible();

    await page.getByRole("button", { name: "Submit declaration", exact: true }).first().click();
    const submitDialog = page.getByRole("dialog", { name: "Submit declaration" });
    await submitDialog.getByRole("button", { name: "Submit declaration", exact: true }).click();
    await expect(page.getByText("Declaration submitted.", { exact: true }).first()).toBeVisible();

    await gotoAuthenticated(page, "/hr-admin/payroll-statutory?tab=declarations", hrAdmin);
    await expectPageReady(page, "Statutory Compliance");
    const refreshedDeclarationLink = page.locator("main a[href*='declarationId=']").first();
    if (await refreshedDeclarationLink.isVisible().catch(() => false)) await refreshedDeclarationLink.click();
    await page.getByRole("button", { name: "Verify proof" }).click();
    await expect(page.getByText("Proof verification completed.", { exact: true })).toBeVisible();
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Verify declaration" }).click();
    await expect(page.getByText("Declaration verification completed.", { exact: true })).toBeVisible();
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Lock for payroll" }).click();
    await expect(page.getByText("Declaration lock completed.", { exact: true })).toBeVisible();
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByText("Locked", { exact: true }).first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
