import { expect, test, type Locator, type Page } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated } from "../helpers/staging-auth";

function uniqueRef(prefix: string) {
  return `PW_${prefix}_${Date.now()}`;
}

function field(scope: Page | Locator, label: string, index = 0) {
  return scope.locator("label.form-field").filter({ hasText: label }).locator("input, select, textarea").nth(index);
}

function card(page: Page, text: string | RegExp) {
  return page.locator("article.record-card").filter({ hasText: text }).first();
}

function detailValue(page: Page, label: string) {
  return page.locator(".detail-row").filter({ hasText: label }).locator(".detail-value").first();
}

async function selectFirstNonEmptyOption(locator: Locator) {
  const value = await locator.evaluate((element) => {
    const select = element as HTMLSelectElement;
    return Array.from(select.options).find((option) => option.value)?.value ?? "";
  });
  expect(value).not.toBe("");
  await locator.selectOption(value);
  return value;
}

async function selectOptionContaining(locator: Locator, text: string) {
  const value = await locator.evaluate((element, targetText) => {
    const select = element as HTMLSelectElement;
    return Array.from(select.options).find((option) => option.textContent?.includes(String(targetText)))?.value ?? "";
  }, text);
  expect(value).not.toBe("");
  await locator.selectOption(value);
  return value;
}

async function submitAndCapture<T>(page: Page, path: string, method: "POST" | "PATCH", action: () => Promise<void>) {
  const [response] = await Promise.all([
    page.waitForResponse((item) => item.url().includes(`/api/hr-admin/${path}`) && item.request().method() === method),
    action(),
  ]);
  return {
    ok: response.ok(),
    status: response.status(),
    requestBody: response.request().postDataJSON() as unknown,
    payload: (await response.json().catch(() => ({}))) as T,
  };
}

async function createEmployee(page: Page, input: {
  code: string;
  firstName: string;
  lastName: string;
  reportingManagerCode?: string;
}) {
  await gotoAuthenticated(page, "/hr-admin/employees/new");
  await field(page, "Employee code").fill(input.code);
  await field(page, "Employment status").selectOption("active");
  await field(page, "First name").fill(input.firstName);
  await field(page, "Last name").fill(input.lastName);
  await field(page, "Preferred name").fill(`${input.firstName} ${input.lastName}`);
  await field(page, "Work email").fill(`${input.code.toLowerCase()}@example.test`);
  await field(page, "Date of birth").fill("1994-01-01");
  await field(page, "Date of joining").fill("2026-01-01");
  await field(page, "Probation end date").fill("2026-06-30");
  await field(page, "Confirmation date").fill("2026-07-01");
  await selectFirstNonEmptyOption(field(page, "Legal entity"));
  await selectFirstNonEmptyOption(field(page, "Branch"));
  await selectFirstNonEmptyOption(field(page, "Department"));
  await selectFirstNonEmptyOption(field(page, "Cost center"));
  await selectFirstNonEmptyOption(field(page, "Designation"));
  await selectFirstNonEmptyOption(field(page, "Employment type"));
  if (input.reportingManagerCode) {
    await selectOptionContaining(field(page, "Reporting manager"), input.reportingManagerCode);
  } else {
    await selectFirstNonEmptyOption(field(page, "Reporting manager"));
  }
  const result = await submitAndCapture<{ id: string }>(page, "employees", "POST", async () => {
    await page.getByRole("button", { name: "Create employee" }).click();
  });
  expect(result.ok).toBeTruthy();
  return result.payload.id;
}

async function createReviewedDocument(page: Page, note: string) {
  const employeeCode = uniqueRef("AUD_DOC_EMP");
  const employeeResponse = await page.request.post("/api/hr-admin/employees", {
    data: {
      employee_code: employeeCode,
      employment_status: "active",
      first_name: "Audit",
      last_name: "Document",
      work_email: `${employeeCode.toLowerCase()}@example.test`,
    },
  });
  expect(employeeResponse.ok()).toBeTruthy();
  const title = uniqueRef("AUD_DOC");
  await gotoAuthenticated(page, "/hr-admin/employee-documents/new");
  await page.reload();
  await selectOptionContaining(field(page, "Employee"), employeeCode);
  await selectFirstNonEmptyOption(field(page, "Category"));
  await field(page, "Title").fill(title);
  await field(page, "Document number").fill(`${title}-NO`);
  await field(page, "File").setInputFiles({
    name: `${title}.pdf`,
    mimeType: "application/pdf",
    buffer: Buffer.from(`%PDF-1.4\n% Phase 3F audit proof ${title}\n%%EOF\n`),
  });
  const createResult = await submitAndCapture<{ id: string }>(page, "employee-documents", "POST", async () => {
    await page.getByRole("button", { name: "Upload document" }).click();
  });
  expect(createResult.ok).toBeTruthy();
  await card(page, title).getByRole("link", { name: "Review", exact: true }).click();
  await expectPageReady(page, "Review employee document");
  await page.waitForLoadState("networkidle");
  await field(page, "Verification status").selectOption("rejected");
  await expect(field(page, "Verification status")).toHaveValue("rejected");
  await field(page, "Rejection reason or review note").fill(note);
  await expect(field(page, "Verification status")).toHaveValue("rejected");
  await expect
    .poll(async () => (
      await page.locator("form").evaluate((form) => Object.fromEntries(new FormData(form as HTMLFormElement).entries()))
    ).verification_status)
    .toBe("rejected");
  const reviewResult = await submitAndCapture<{ verification_status: string; review_history: Array<{ comment: string; new_status: string }> }>(
    page,
    `employee-documents/${createResult.payload.id}`,
    "PATCH",
    async () => {
      await page.getByRole("button", { name: "Save review" }).click();
    },
  );
  expect(reviewResult.ok).toBeTruthy();
  expect(reviewResult.requestBody).toMatchObject({ verification_status: "rejected" });
  expect(reviewResult.payload.verification_status).toBe("rejected");
  expect(reviewResult.payload.review_history.some((entry) => entry.comment === note && entry.new_status === "rejected")).toBeTruthy();
  return { documentId: createResult.payload.id, note, title };
}

test.describe("Phase 3F closure certification", () => {
  test("completed reporting-manager movement writes back to employee detail", async ({ page }) => {
    test.setTimeout(5 * 60 * 1000);
    const fromManagerCode = uniqueRef("FROM_MGR");
    const toManagerCode = uniqueRef("TO_MGR");
    const employeeCode = uniqueRef("MOVE_EMP");
    const workflowRef = uniqueRef("MOVE_WRITEBACK");

    await createEmployee(page, { code: fromManagerCode, firstName: "Source", lastName: "Manager" });
    await createEmployee(page, { code: toManagerCode, firstName: "Target", lastName: "Manager" });
    const employeeId = await createEmployee(page, {
      code: employeeCode,
      firstName: "Moving",
      lastName: "Employee",
      reportingManagerCode: fromManagerCode,
    });

    await gotoAuthenticated(page, `/hr-admin/employees?employeeId=${employeeId}`);
    await expectPageReady(page, "Employees");
    await expect(page.getByText(employeeCode).first()).toBeVisible();
    await expect(detailValue(page, "Reporting Manager")).toContainText("Source Manager");

    await gotoAuthenticated(page, "/hr-admin/movements/new");
    await selectOptionContaining(field(page, "Employee"), employeeCode);
    await field(page, "Movement type").selectOption("reporting_change");
    await field(page, "Status").selectOption("completed");
    await field(page, "Effective date").fill("2026-10-01");
    await field(page, "Reason").fill("Phase 3F completed reporting manager writeback.");
    await field(page, "Workflow reference").fill(workflowRef);
    await selectOptionContaining(field(page, "From manager"), fromManagerCode);
    await selectOptionContaining(field(page, "To manager"), toManagerCode);
    await field(page, "Current snapshot JSON").fill(JSON.stringify({ reporting_manager: fromManagerCode }, null, 2));
    const movementResult = await submitAndCapture<{ id: string }>(page, "movements", "POST", async () => {
      await page.getByRole("button", { name: "Create movement" }).click();
    });
    expect(movementResult.ok).toBeTruthy();
    await expect(page).toHaveURL(/\/hr-admin\/movements$/);
    await expect(card(page, workflowRef)).toBeVisible();

    await gotoAuthenticated(page, `/hr-admin/employees?employeeId=${employeeId}`);
    await expectPageReady(page, "Employees");
    await expect(page.getByText(employeeCode).first()).toBeVisible();
    await expect(detailValue(page, "Reporting Manager")).toContainText("Target Manager");
    await expect(detailValue(page, "Reporting Manager")).not.toContainText("Source Manager");
    await expectNoHorizontalOverflow(page);
  });

  test("document review history is tied to exact source record and audit aggregation", async ({ page }) => {
    test.setTimeout(4 * 60 * 1000);
    await gotoAuthenticated(page, "/hr-admin/employees");
    const note = uniqueRef("AUDIT_NOTE");
    const reviewedDocument = await createReviewedDocument(page, note);

    await gotoAuthenticated(page, `/hr-admin/employee-documents/${reviewedDocument.documentId}/review`);
    await expectPageReady(page, "Review employee document");
    await expect(field(page, "Rejection reason or review note")).toHaveValue(note);
    await expect(page.getByRole("heading", { name: "Review history" })).toBeVisible();
    await expect(card(page, note)).toBeVisible();
    await expect(card(page, note)).toContainText("rejected");

    await gotoAuthenticated(page, "/hr-admin/audit");
    await expectPageReady(page, "Audit center");
    await field(page, "Search").fill(note);
    await field(page, "Source").selectOption("document_review");
    await Promise.all([
      page.waitForURL((url) => url.searchParams.get("source") === "document_review"),
      page.getByRole("button", { name: "Apply filters" }).click(),
    ]);
    await expectPageReady(page, "Audit center");
    await expect(card(page, note)).toBeVisible();
    await expect(card(page, note)).toContainText("document review");
    await expect(card(page, note)).toContainText("rejected");
    await expect(card(page, note).getByRole("link", { name: "Open source" })).toHaveAttribute(
      "href",
      `/hr-admin/employee-documents/${reviewedDocument.documentId}/review`,
    );
    await expectNoHorizontalOverflow(page);
  });
});
