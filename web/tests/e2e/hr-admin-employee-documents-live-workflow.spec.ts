import { expect, test, type Locator, type Page } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated, hrAdmin } from "../helpers/staging-auth";

function uniqueRef(prefix: string) {
  return `PW_${prefix}_${Date.now()}`;
}

function field(scope: Page | Locator, label: string | RegExp) {
  return scope.locator("label.form-field").filter({ hasText: label }).locator("input, select, textarea").first();
}

async function selectOptionContaining(locator: Locator, text: string) {
  const value = await locator.evaluate((element, targetText) => {
    const select = element as HTMLSelectElement;
    return Array.from(select.options).find((option) => option.textContent?.includes(String(targetText)))?.value ?? "";
  }, text);
  expect(value).not.toBe("");
  await locator.selectOption(value);
}

async function waitForDocumentFormHydration(page: Page | Locator) {
  await expect(page.locator(".document-child-form[data-hydrated='true']").first()).toBeVisible();
}

async function createEmployee(page: Page, employeeCode: string) {
  const response = await page.request.post("/api/hr-admin/employees", {
    data: {
      employee_code: employeeCode,
      employment_status: "active",
      first_name: "Document",
      last_name: "Workflow",
      work_email: `${employeeCode.toLowerCase()}@example.test`,
    },
  });
  const payload = await response.json().catch(() => ({}));
  expect(response.ok(), `Employee setup failed: ${response.status()} ${JSON.stringify(payload)}`).toBeTruthy();
}

async function createDocumentCategory(page: Page, code: string) {
  const response = await page.request.post("/api/hr-admin/document-categories", {
    data: {
      code,
      name: `Browser ${code}`,
      category_type: "other",
      metadata_schema: { source: "playwright" },
    },
  });
  const payload = await response.json().catch(() => ({}));
  expect(response.ok(), `Category setup failed: ${response.status()} ${JSON.stringify(payload)}`).toBeTruthy();
}

test.describe("HR Admin employee document live browser workflow", () => {
  test.describe.configure({ timeout: 180_000 });

  test("uploads an employee document, opens standard review modal, and saves review outcome", async ({ page }) => {
    test.skip(!process.env.HRMS_API_BASE_URL, "Live document workflow requires HRMS_API_BASE_URL.");

    const suffix = Date.now();
    const employeeCode = uniqueRef("DOC_EMP");
    const categoryCode = uniqueRef("DOC_CAT");
    const title = `Browser document ${suffix}`;
    const reviewNote = `Browser document review ${suffix}`;

    await gotoAuthenticated(page, "/hr-admin/employee-documents/new", hrAdmin);
    await createEmployee(page, employeeCode);
    await createDocumentCategory(page, categoryCode);
    await page.reload({ waitUntil: "domcontentloaded" });
    await expectPageReady(page, "Upload employee document");
    await waitForDocumentFormHydration(page);

    await page.getByRole("button", { name: "Upload document" }).click();
    await expect(page.getByText("Review the highlighted document fields and try again.")).toBeVisible();
    await expect(field(page, "Employee")).toHaveAttribute("aria-invalid", "true");
    await expect(field(page, "Category")).toHaveAttribute("aria-invalid", "true");
    await expect(field(page, "Title")).toHaveAttribute("aria-invalid", "true");
    await expect(field(page, "File")).toHaveAttribute("aria-invalid", "true");

    await selectOptionContaining(field(page, "Employee"), employeeCode);
    await selectOptionContaining(field(page, "Category"), categoryCode);
    await field(page, "Title").fill(title);
    await field(page, "Document number").fill(`${categoryCode}-NO`);
    await field(page, "Issued on").fill("2026-04-01");
    await field(page, "Expires on").fill("2027-04-01");
    await field(page, "File").setInputFiles({
      name: `${categoryCode}.pdf`,
      mimeType: "application/pdf",
      buffer: Buffer.from(`%PDF-1.4\n% HR admin document workflow ${suffix}\n%%EOF\n`),
    });

    const [uploadResponse] = await Promise.all([
      page.waitForResponse((response) => response.url().includes("/api/hr-admin/employee-documents") && response.request().method() === "POST"),
      page.getByRole("button", { name: "Upload document" }).click(),
    ]);
    const uploadPayload = await uploadResponse.json().catch(() => ({}));
    expect(uploadResponse.ok(), `Document upload failed: ${uploadResponse.status()} ${JSON.stringify(uploadPayload)}`).toBeTruthy();
    expect(String((uploadPayload as { id?: string }).id ?? "")).not.toBe("");

    await expect(page).toHaveURL(/\/hr-admin\/employee-documents$/);
    await expectPageReady(page, /Employee document review/);
    await field(page, "Search").fill(title);
    await Promise.all([
      page.waitForURL((url) => url.searchParams.get("q") === title),
      page.getByRole("button", { name: "Apply filters" }).click(),
    ]);
    await expect(page.getByRole("table").first()).toContainText(title);
    await page.getByRole("button", { name: "Inspect" }).first().click();
    await expect(page.getByRole("heading", { name: "Document detail" })).toBeVisible();
    await expect(page.getByText(title).first()).toBeVisible();

    await page.getByRole("button", { name: "Review", exact: true }).first().click();
    await expect(page).toHaveURL(/reviewDocument=/);
    const reviewDialog = page.getByRole("dialog", { name: new RegExp(`Review ${title}`) });
    await expect(reviewDialog).toBeVisible();
    await waitForDocumentFormHydration(reviewDialog);
    await expect(reviewDialog.getByRole("heading", { name: "Document context" })).toBeVisible();
    await expect(reviewDialog.getByRole("heading", { name: "Review details" })).toBeVisible();
    await expect(reviewDialog.getByText("Decision effect")).toBeVisible();

    await field(reviewDialog, "Verification status").selectOption("verified");
    await field(reviewDialog, "Rejection reason or review note").fill(reviewNote);
    const [reviewResponse] = await Promise.all([
      page.waitForResponse((response) =>
        response.url().includes(`/api/hr-admin/employee-documents/${(uploadPayload as { id: string }).id}`) &&
        response.request().method() === "PATCH"
      ),
      reviewDialog.getByRole("button", { name: "Save review" }).click(),
    ]);
    const reviewPayload = await reviewResponse.json().catch(() => ({}));
    expect(reviewResponse.ok(), `Document review failed: ${reviewResponse.status()} ${JSON.stringify(reviewPayload)}`).toBeTruthy();

    await expect(page).toHaveURL(/\/hr-admin\/employee-documents.*review_saved=1/);
    await expect(page.getByText("Review action complete.")).toBeVisible();
    await expect(page.getByText("Document review updated.")).toBeVisible();
    await expect(page.getByRole("table").first()).toContainText(title);
    await expectNoHorizontalOverflow(page);
  });
});
