import { expect, test, type Locator, type Page } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { employee, gotoAuthenticated, hrAdmin, requestWithBrowserSession } from "../helpers/staging-auth";

function field(scope: Page | Locator, label: string) {
  return scope.getByLabel(label, { exact: true }).or(
    scope.locator("label.form-field").filter({ hasText: label }).locator("input, select, textarea"),
  ).first();
}

async function createUploadCategory(page: Page, suffix: number) {
  await gotoAuthenticated(page, "/hr-admin/employee-documents", hrAdmin);
  const response = await requestWithBrowserSession(page, "/api/hr-admin/document-categories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      allow_employee_upload: true,
      allow_multiple_files: true,
      category_type: "other",
      code: `wave4-${suffix}`,
      name: `Wave 4 ${suffix}`,
      visibility_rules: { accepted_mime_types: ["application/pdf"] },
    }),
  });
  expect(response.status, response.body).toBe(201);
  const category = JSON.parse(response.body) as { id: string; name: string };
  const requirement = await requestWithBrowserSession(page, "/api/hr-admin/document-requirements", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      category_id: category.id,
      is_active: true,
      is_mandatory: true,
      priority: 10,
      required_within_days_of_joining: 0,
    }),
  });
  expect(requirement.status, requirement.body).toBe(201);
  return category;
}

async function openUpload(page: Page, categoryName: string, title: string) {
  await gotoAuthenticated(page, "/ess/documents", employee);
  await expectPageReady(page, "Documents");
  await page.getByRole("button", { name: "Upload document" }).first().click();
  const dialog = page.getByRole("dialog", { name: /Upload document|Replace document/ });
  await expect(dialog).toBeVisible();
  await field(dialog, "Category").selectOption({ label: categoryName });
  await field(dialog, "Title").fill(title);
  return dialog;
}

test.describe.configure({ mode: "serial" });

test.describe("CRUD V2 Wave 4 ESS document package", () => {
  test("upload pending state is truthful and durable success appears only after persistence", async ({ page }) => {
    test.setTimeout(120_000);
    const suffix = Date.now();
    const category = await createUploadCategory(page, suffix);
    const dialog = await openUpload(page, category.name, `Wave 4 pending ${suffix}`);
    await field(dialog, "File").setInputFiles({
      name: `wave4-pending-${suffix}.pdf`,
      mimeType: "application/pdf",
      buffer: Buffer.from(`%PDF-1.4\nWave 4 pending ${suffix}\n%%EOF\n`),
    });

    let releaseUpload!: () => void;
    const uploadReleased = new Promise<void>((resolve) => { releaseUpload = resolve; });
    await page.route("**/api/me/employee-documents", async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      await uploadReleased;
      await route.continue();
    });

    const submit = dialog.getByRole("button", { name: "Submit for review" });
    await submit.click();
    await expect(dialog.getByRole("button", { name: "Uploading document" })).toBeDisabled();
    await expect(page.getByRole("status").filter({ hasText: "Document uploaded successfully." })).toHaveCount(0);
    releaseUpload();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole("main").getByRole("status").filter({ hasText: "Document uploaded successfully." })).toBeVisible();
    await page.unroute("**/api/me/employee-documents");

    await page.reload();
    await expect(page.getByText(`Wave 4 pending ${suffix}`, { exact: false }).first()).toBeVisible();
  });

  test("failed download is actionable and discloses no private URL or stack trace", async ({ page }) => {
    test.setTimeout(120_000);
    const suffix = Date.now();
    const category = await createUploadCategory(page, suffix);
    const title = `Wave 4 download ${suffix}`;
    const dialog = await openUpload(page, category.name, title);
    await field(dialog, "File").setInputFiles({
      name: `wave4-download-${suffix}.pdf`,
      mimeType: "application/pdf",
      buffer: Buffer.from(`%PDF-1.4\nWave 4 download ${suffix}\n%%EOF\n`),
    });
    await dialog.getByRole("button", { name: "Submit for review" }).click();
    await expect(dialog).toHaveCount(0);
    await page.reload();

    const row = page.locator("article, tr").filter({ hasText: title }).first();
    await row.getByRole("button", { name: /Review|View/ }).click();
    const detail = page.getByRole("dialog", { name: /Document detail|Wave 4/ });
    const link = detail.getByRole("link", { name: /Download|Download file/ }).first();
    const href = await link.getAttribute("href");
    expect(href).toMatch(/^\/api\/me\/employee-documents\/[0-9a-f-]+\/download$/i);
    if (!href) throw new Error("Expected a private employee-document download route.");

    const unauthenticatedStatus = await page.evaluate(async (downloadHref) => {
      const response = await fetch(downloadHref, { credentials: "omit" });
      return response.status;
    }, href);
    expect([401, 403]).toContain(unauthenticatedStatus);

    await page.route(`**${href}`, async (route) => {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ detail: "The private document is temporarily unavailable. Try again." }),
      });
    });
    const failed = await page.evaluate(async (downloadHref) => {
      const response = await fetch(downloadHref, { credentials: "include" });
      return { status: response.status, body: await response.text() };
    }, href);
    expect(failed.status).toBe(503);
    expect(failed.body).toContain("temporarily unavailable");
    expect(failed.body).not.toMatch(/Traceback|\/Users\/|document-artifacts\//);
  });

  test("cancel is non-persistent and compact upload UI remains keyboard reachable", async ({ page }) => {
    const suffix = Date.now();
    const category = await createUploadCategory(page, suffix);
    await page.setViewportSize({ width: 390, height: 844 });
    const dialog = await openUpload(page, category.name, `Wave 4 cancelled ${suffix}`);
    const file = field(dialog, "File");
    await file.setInputFiles({
      name: `wave4-cancel-${suffix}.pdf`,
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4\nWave 4 cancelled\n%%EOF\n"),
    });
    await file.focus();
    await expect(file).toBeFocused();
    await expect(dialog.getByText(/Selected:/)).toContainText(`wave4-cancel-${suffix}.pdf`);
    page.once("dialog", async (confirmation) => {
      expect(confirmation.message()).toBe("Discard unsaved changes?");
      await confirmation.accept();
    });
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
    await page.reload();
    await expect(page.getByText(`Wave 4 cancelled ${suffix}`, { exact: false })).toHaveCount(0);
  });
});
