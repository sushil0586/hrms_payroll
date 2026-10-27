import { expect, test, type Locator, type Page } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { employee, gotoAuthenticated, hrAdmin, requestWithBrowserSession } from "../helpers/staging-auth";

function uniqueRef(prefix: string) {
  return `PW_${prefix}_${Date.now()}`;
}

function field(scope: Page | Locator, label: string | RegExp) {
  return scope.getByLabel(label, { exact: typeof label === "string" }).first();
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

async function getAuthenticatedJson<T>(page: Page, path: string): Promise<T> {
  const response = await requestWithBrowserSession(page, path);
  expect(response.status, `GET ${path} failed: ${response.status} ${response.body}`).toBe(200);
  return JSON.parse(response.body) as T;
}

function apiData<T>(payload: T | { data: T }): T {
  return typeof payload === "object" && payload !== null && "data" in payload ? payload.data : payload;
}

async function createEmployee(page: Page, employeeCode: string) {
  const response = await requestWithBrowserSession(page, "/api/hr-admin/employees", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      employee_code: employeeCode,
      employment_status: "active",
      first_name: "Document",
      last_name: "Workflow",
      work_email: `${employeeCode.toLowerCase()}@example.test`,
    }),
  });
  expect(response.status, `Employee setup failed: ${response.status} ${response.body}`).toBe(201);
}

async function createDocumentCategory(page: Page, code: string) {
  const response = await requestWithBrowserSession(page, "/api/hr-admin/document-categories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code,
      name: `Browser ${code}`,
      category_type: "other",
      metadata_schema: { source: "playwright" },
    }),
  });
  expect(response.status, `Category setup failed: ${response.status} ${response.body}`).toBe(201);
}

test.describe("HR Admin employee document live browser workflow", () => {
  test.describe.configure({ timeout: 180_000 });

  test("creates a document category and employee requirement through the browser", async ({ page }) => {
    const suffix = Date.now();
    const categoryCode = uniqueRef("REQ_CAT");
    const categoryName = `Browser requirement category ${suffix}`;

    await gotoAuthenticated(page, "/hr-admin/document-categories/new", hrAdmin);
    await expectPageReady(page, "Create document category");
    await waitForDocumentFormHydration(page);
    await field(page, "Code").fill(categoryCode);
    await field(page, "Name").fill(categoryName);
    await field(page, "Description").fill("Browser-created mandatory employee document requirement.");
    await field(page, "Visibility rules JSON").fill('{"visible_to":["hr_admin","employee"]}');
    await page.getByText("Requires verification", { exact: true }).locator("xpath=ancestor::label[1]").getByRole("checkbox").check();
    await page.getByText("Allow employee upload", { exact: true }).locator("xpath=ancestor::label[1]").getByRole("checkbox").check();

    const [categoryResponse] = await Promise.all([
      page.waitForResponse((response) => response.url().includes("/api/hr-admin/document-categories") && response.request().method() === "POST"),
      page.getByRole("button", { name: "Create category" }).click(),
    ]);
    expect(categoryResponse.status()).toBe(201);
    await expect(page).toHaveURL(/\/hr-admin\/document-categories(?:\?.*)?$/);
    await expect(page.getByRole("table", { name: "Document categories" })).toContainText(categoryCode);
    const categoryPayload = apiData(await getAuthenticatedJson<Array<{ id: string; code: string; name: string }> | { data: Array<{ id: string; code: string; name: string }> }>(page, "/api/hr-admin/document-categories"))
      .find((item) => item.code === categoryCode);
    expect(categoryPayload).toMatchObject({ code: categoryCode, name: categoryName });

    await gotoAuthenticated(page, "/hr-admin/document-requirements/new", hrAdmin);
    await expectPageReady(page, "Create document requirement");
    await waitForDocumentFormHydration(page);
    await field(page, /Category/).selectOption(String(categoryPayload!.id));
    await field(page, "Required within joining days").fill("30");
    await field(page, "Priority").fill("90");
    await page.getByText("Mandatory", { exact: true }).locator("xpath=ancestor::label[1]").getByRole("checkbox").check();
    await page.getByText("Active", { exact: true }).locator("xpath=ancestor::label[1]").getByRole("checkbox").check();

    const [requirementResponse] = await Promise.all([
      page.waitForResponse((response) => response.url().includes("/api/hr-admin/document-requirements") && response.request().method() === "POST"),
      page.getByRole("button", { name: "Create requirement" }).click(),
    ]);
    expect(requirementResponse.status()).toBe(201);
    await expect(page).toHaveURL(/\/hr-admin\/document-requirements(?:\?.*)?$/);
    await expect(page.getByRole("row").filter({ hasText: categoryName }).first()).toContainText("Mandatory");
    await gotoAuthenticated(page, "/ess", employee);
    const denied = await requestWithBrowserSession(page, "/api/hr-admin/document-categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: `${categoryCode}_DENIED`, name: "Denied employee category" }),
    });
    expect(denied.status).toBe(403);
  });

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
    expect(uploadResponse.ok(), `Document upload failed: ${uploadResponse.status()}`).toBeTruthy();
    await expect(page.getByRole("heading", { name: "Document stored" })).toBeVisible();
    const uploadedDocumentPayload = apiData(await getAuthenticatedJson<{
      items: Array<{ id: string; title: string }>;
    } | { data: { items: Array<{ id: string; title: string }> } }>(page, "/api/hr-admin/employee-documents"));
    const uploadedDocument = uploadedDocumentPayload.items
      .find((item) => item.title === title);
    expect(uploadedDocument?.id).toBeTruthy();
    await page.getByRole("link", { name: "View document queue" }).click();
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
    await expect(field(reviewDialog, "Verification status")).toBeVisible();
    await field(reviewDialog, "Verification status").selectOption("verified");
    await field(reviewDialog, "Rejection reason or review note").fill(reviewNote);
    const [reviewResponse] = await Promise.all([
      page.waitForResponse((response) =>
        response.url().includes(`/api/hr-admin/employee-documents/${uploadedDocument!.id}`) &&
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

    const rejectedEmployeeCode = uniqueRef("DOC_REJECT_EMP");
    const rejectedCategoryCode = uniqueRef("DOC_REJECT_CAT");
    const rejectedTitle = `Rejected browser document ${suffix}`;
    const rejectionReason = `Rejected by browser certification ${suffix}`;

    await createEmployee(page, rejectedEmployeeCode);
    await createDocumentCategory(page, rejectedCategoryCode);
    await gotoAuthenticated(page, "/hr-admin/employee-documents/new", hrAdmin);
    await waitForDocumentFormHydration(page);
    await selectOptionContaining(field(page, "Employee"), rejectedEmployeeCode);
    await selectOptionContaining(field(page, "Category"), rejectedCategoryCode);
    await field(page, "Title").fill(rejectedTitle);
    await field(page, "Document number").fill(`${rejectedCategoryCode}-NO`);
    await field(page, "Issued on").fill("2026-04-01");
    await field(page, "Expires on").fill("2027-04-01");
    await field(page, "File").setInputFiles({
      name: `${rejectedCategoryCode}.pdf`,
      mimeType: "application/pdf",
      buffer: Buffer.from(`%PDF-1.4\n% rejected HR admin document workflow ${suffix}\n%%EOF\n`),
    });

    const [rejectedUploadResponse] = await Promise.all([
      page.waitForResponse((response) => response.url().includes("/api/hr-admin/employee-documents") && response.request().method() === "POST"),
      page.getByRole("button", { name: "Upload document" }).click(),
    ]);
    expect(rejectedUploadResponse.ok(), `Rejected-path upload failed: ${rejectedUploadResponse.status()}`).toBeTruthy();
    await expect(page.getByRole("heading", { name: "Document stored" })).toBeVisible();
    const rejectedDocumentPayload = apiData(await getAuthenticatedJson<{
      items: Array<{ id: string; title: string }>;
    } | { data: { items: Array<{ id: string; title: string }> } }>(page, "/api/hr-admin/employee-documents"));
    const rejectedDocument = rejectedDocumentPayload.items
      .find((item) => item.title === rejectedTitle);
    expect(rejectedDocument?.id).toBeTruthy();
    await page.getByRole("link", { name: "View document queue" }).click();

    await field(page, "Search").fill(rejectedTitle);
    await Promise.all([
      page.waitForURL((url) => url.searchParams.get("q") === rejectedTitle),
      page.getByRole("button", { name: "Apply filters" }).click(),
    ]);
    await expect(page.getByRole("table").first()).toContainText(rejectedTitle);
    await page.getByRole("button", { name: "Inspect" }).first().click();
    await expect(page.getByRole("heading", { name: "Document detail" })).toBeVisible();
    await page.getByRole("button", { name: "Review", exact: true }).first().click();
    const rejectedDialog = page.getByRole("dialog", { name: new RegExp(`Review ${rejectedTitle}`) });
    await expect(rejectedDialog).toBeVisible();
    await expect(field(rejectedDialog, "Verification status")).toBeVisible();
    await field(rejectedDialog, "Verification status").selectOption("rejected");
    await field(rejectedDialog, "Rejection reason or review note").fill(rejectionReason);
    const [rejectedReviewResponse] = await Promise.all([
      page.waitForResponse((response) =>
        response.url().includes(`/api/hr-admin/employee-documents/${rejectedDocument!.id}`) &&
        response.request().method() === "PATCH"
      ),
      rejectedDialog.getByRole("button", { name: "Save review" }).click(),
    ]);
    expect(rejectedReviewResponse.ok(), `Document rejection failed: ${rejectedReviewResponse.status()}`).toBeTruthy();
    await expect(page.getByText("Review action complete.")).toBeVisible();
    const rejectedStatePayload = apiData(await getAuthenticatedJson<{
      items: Array<{ id: string; rejection_reason: string; verification_status: string }>;
    } | { data: { items: Array<{ id: string; rejection_reason: string; verification_status: string }> } }>(
      page,
      `/api/hr-admin/employee-documents?q=${encodeURIComponent(rejectedTitle)}`,
    ));
    const rejectedState = rejectedStatePayload.items.find((item) => item.id === rejectedDocument!.id);
    expect(rejectedState).toMatchObject({ rejection_reason: rejectionReason, verification_status: "rejected" });
    await expectNoHorizontalOverflow(page);
  });
});
