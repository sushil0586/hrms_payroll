import { expect, test, type Locator, type Page } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated } from "../helpers/staging-auth";

function uniqueRef(prefix: string) {
  return `PW_${prefix}_${Date.now()}`;
}

function field(scope: Page | Locator, label: string, index = 0) {
  return scope
    .locator("label.form-field")
    .filter({ hasText: label })
    .locator("input, select, textarea")
    .nth(index);
}

function card(page: Page, text: string | RegExp) {
  return page.locator("article.record-card").filter({ hasText: text }).first();
}

async function expectNativeRequired(locator: Locator) {
  await expect
    .poll(async () => locator.evaluate((element) => (element as HTMLInputElement | HTMLSelectElement).validity.valueMissing))
    .toBe(true);
}

async function expectSelectHasOptions(locator: Locator, minimum = 1) {
  const count = await locator.evaluate((element) => {
    const select = element as HTMLSelectElement;
    return Array.from(select.options).filter((option) => option.value).length;
  });
  expect(count).toBeGreaterThanOrEqual(minimum);
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
    payload: (await response.json().catch(() => ({}))) as T,
  };
}

async function expectDocumentUploadPageCertified(page: Page) {
  await expectPageReady(page, "Upload employee document");
  await expect(page.getByRole("heading", { name: "Employee document upload" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Upload details" })).toBeVisible();
  for (const label of ["Employee", "Category", "Title", "Document number", "Issued on", "Expires on", "File"]) {
    await expect(field(page, label), `${label} should be visible`).toBeVisible();
  }
  await expectSelectHasOptions(field(page, "Employee"));
  await expectSelectHasOptions(field(page, "Category"));
  await expect(page.getByRole("button", { name: "Upload document" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Cancel" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to employee documents" })).toBeVisible();
  await expectNoHorizontalOverflow(page);
}

async function expectDocumentsQueueCertified(page: Page, title?: string) {
  await expectPageReady(page, /Employee document review/);
  for (const metric of ["Documents in queue", "Categories configured", "Expiring on page", "Expired on page"]) {
    await expect(page.locator(".metric-tile, .metric-tile-soft").filter({ hasText: metric }).first()).toBeVisible();
  }
  await expect(page.getByRole("heading", { name: "Documents" })).toBeVisible();
  for (const label of ["Search", "Verification status", "Record status", "Category", "Expiry focus", "Rows per page"]) {
    await expect(field(page, label), `${label} queue filter should be visible`).toBeVisible();
  }
  for (const action of ["Apply filters", "Clear filters", "Select page", /Send reminder/]) {
    await expect(page.getByRole("button", { name: action }).first()).toBeVisible();
  }
  await expect(page.getByText("shared state").first()).toBeVisible();
  if (title) {
    await expect(card(page, title)).toBeVisible();
    await expect(card(page, title).getByRole("link", { name: "Review", exact: true })).toBeVisible();
  }
  await expectNoHorizontalOverflow(page);
}

async function expectOnboardingFormCertified(page: Page, mode: "create" | "edit") {
  await expectPageReady(page, mode === "create" ? "Create onboarding" : "Edit onboarding");
  await expect(page.getByRole("heading", { name: mode === "create" ? "Create onboarding workflow" : "Edit onboarding workflow" })).toBeVisible();
  for (const heading of ["Joiner and status", "Routing and ownership", "Checklist and notes", "Checklist items"]) {
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
  }
  for (const label of [
    "Employee",
    "Status",
    "Expected joining date",
    "Actual joining date",
    "Lifecycle template trigger",
    "Assigned owner",
    "Workflow reference",
    "Notes",
  ]) {
    await expect(field(page, label), `${label} should be visible`).toBeVisible();
  }
  for (const label of ["Employee", "Status", "Assigned owner"]) {
    await expectSelectHasOptions(field(page, label));
  }
  await expect(page.getByRole("button", { name: "Add checklist item" })).toBeVisible();
  await expect(page.getByRole("button", { name: mode === "create" ? "Create onboarding" : "Save changes" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Cancel" })).toBeVisible();
  await expect(page.getByText("Readiness preview.")).toBeVisible();
  await expectNoHorizontalOverflow(page);
}

async function expectOnboardingQueueCertified(page: Page, workflowRef?: string) {
  await expectPageReady(page, /Onboarding operations/);
  for (const metric of ["Onboarding records", "Rows on current page", "Document blockers", "Future due docs"]) {
    await expect(page.locator(".metric-tile, .metric-tile-soft").filter({ hasText: metric }).first()).toBeVisible();
  }
  await expect(page.getByRole("heading", { name: "Onboardings" })).toBeVisible();
  for (const label of ["Search", "Status", "Owner", "Rows per page", "Bulk owner", "Bulk status"]) {
    await expect(field(page, label), `${label} onboarding control should be visible`).toBeVisible();
  }
  for (const action of ["Apply filters", "Clear filters", "Select page", /Assign owner/, /Clear owner/, /Set status/]) {
    await expect(page.getByRole("button", { name: action }).first()).toBeVisible();
  }
  if (workflowRef) {
    await expect(card(page, workflowRef)).toBeVisible();
    await expect(card(page, workflowRef).getByRole("link", { name: "Edit" })).toBeVisible();
  }
  await expectNoHorizontalOverflow(page);
}

test.describe("Phase 3B employee documents and onboarding certification", () => {
  test("employee document upload and queue controls are certified", async ({ page }) => {
    test.setTimeout(3 * 60 * 1000);
    const title = uniqueRef("DOC");
    const employeeCode = uniqueRef("DOC_EMP");

    await gotoAuthenticated(page, "/hr-admin/employee-documents/new");
    const employeeResponse = await page.request.post("/api/hr-admin/employees", {
      data: {
        employee_code: employeeCode,
        employment_status: "active",
        first_name: "Document",
        last_name: "Certified",
        work_email: `${employeeCode.toLowerCase()}@example.test`,
      },
    });
    expect(employeeResponse.ok()).toBeTruthy();
    await page.reload();
    await expectDocumentUploadPageCertified(page);

    await page.getByRole("button", { name: "Upload document" }).click();
    await expectNativeRequired(field(page, "Employee"));
    await expectNativeRequired(field(page, "Category"));
    await expectNativeRequired(field(page, "Title"));
    await expectNativeRequired(field(page, "File"));

    await selectOptionContaining(field(page, "Employee"), employeeCode);
    await selectFirstNonEmptyOption(field(page, "Category"));
    await field(page, "Title").fill(title);
    await field(page, "Document number").fill(`${title}-NO`);
    await field(page, "Issued on").fill("2026-04-01");
    await field(page, "Expires on").fill("2027-04-01");
    await field(page, "File").setInputFiles({
      name: `${title}.pdf`,
      mimeType: "application/pdf",
      buffer: Buffer.from(`%PDF-1.4\n% Phase 3B browser upload proof ${title}\n%%EOF\n`),
    });

    const result = await submitAndCapture<{ id: string }>(page, "employee-documents", "POST", async () => {
      await page.getByRole("button", { name: "Upload document" }).click();
    });
    expect(result.ok).toBeTruthy();
    await expect(page).toHaveURL(/\/hr-admin\/employee-documents$/);
    await expectDocumentsQueueCertified(page, title);

    await field(page, "Search").fill(title);
    await Promise.all([
      page.waitForURL((url) => url.searchParams.get("q") === title),
      page.getByRole("button", { name: "Apply filters" }).click(),
    ]);
    await expectDocumentsQueueCertified(page, title);
    await field(page, "Expiry focus").selectOption("expiring");
    await page.getByRole("button", { name: "Clear filters" }).click();
    await expect(page).toHaveURL(/\/hr-admin\/employee-documents$/);
    await expectDocumentsQueueCertified(page);
  });

  test("onboarding create, edit, queue filters, checklist controls, and completion guard are certified", async ({ page }) => {
    test.setTimeout(3 * 60 * 1000);
    const workflowRef = uniqueRef("ONB");
    const employeeCode = uniqueRef("ONB_EMP");

    await gotoAuthenticated(page, "/hr-admin/onboardings/new");
    const employeeResponse = await page.request.post("/api/hr-admin/employees", {
      data: {
        employee_code: employeeCode,
        employment_status: "active",
        first_name: "Onboarding",
        last_name: "Certified",
        work_email: `${employeeCode.toLowerCase()}@example.test`,
      },
    });
    expect(employeeResponse.ok()).toBeTruthy();
    await page.reload();
    await expectOnboardingFormCertified(page, "create");

    await selectOptionContaining(field(page, "Employee"), employeeCode);
    await field(page, "Status").selectOption("in_progress");
    await field(page, "Expected joining date").fill("2026-05-01");
    await field(page, "Actual joining date").fill("2026-05-02");
    await selectFirstNonEmptyOption(field(page, "Assigned owner"));
    await field(page, "Workflow reference").fill(workflowRef);
    await field(page, "Notes").fill(`Phase 3B onboarding notes for ${workflowRef}.`);

    await page.getByRole("button", { name: "Add checklist item" }).click();
    const checklistCard = page.locator("article.record-card").filter({ hasText: "onboarding-item-1" }).first();
    await expect(checklistCard).toBeVisible();
    for (const label of ["Code", "Label", "Owner", "Escalation owner", "Due on", "Escalate after days", "Notes"]) {
      await expect(field(checklistCard, label), `${label} checklist field should be visible`).toBeVisible();
    }
    for (const label of ["Required", "Blocking", "Done", "Auto reassign on escalation"]) {
      await expect(checklistCard.locator("label.detail-row").filter({ hasText: label }).locator("input[type='checkbox']")).toBeVisible();
    }
    await field(checklistCard, "Label").fill("Collect joining documents");
    await selectFirstNonEmptyOption(field(checklistCard, "Owner"));
    await selectFirstNonEmptyOption(field(checklistCard, "Escalation owner"));
    await field(checklistCard, "Due on").fill("2026-05-03");
    await field(checklistCard, "Escalate after days").fill("2");
    await field(checklistCard, "Notes").fill("Checklist item certified through browser.");
    await checklistCard.locator("label.detail-row").filter({ hasText: "Done" }).locator("input[type='checkbox']").check();
    await expect(page.getByText("1/1 checklist items complete, 0 open.")).toBeVisible();

    await page.getByRole("button", { name: "Add checklist item" }).click();
    await expect(page.locator("article.record-card").filter({ hasText: "onboarding-item-2" })).toBeVisible();
    await page.locator("article.record-card").filter({ hasText: "onboarding-item-2" }).getByRole("button", { name: "Remove" }).click();
    await expect(page.locator("article.record-card").filter({ hasText: "onboarding-item-2" })).toHaveCount(0);

    const createResult = await submitAndCapture<{ id: string }>(page, "onboardings", "POST", async () => {
      await page.getByRole("button", { name: "Create onboarding" }).click();
    });
    expect(createResult.ok).toBeTruthy();
    await expect(page).toHaveURL(/\/hr-admin\/onboardings$/);
    await expectOnboardingQueueCertified(page, workflowRef);

    await field(page, "Search").fill(workflowRef);
    await Promise.all([
      page.waitForURL((url) => url.searchParams.get("q") === workflowRef),
      page.getByRole("button", { name: "Apply filters" }).click(),
    ]);
    await expectOnboardingQueueCertified(page, workflowRef);

    await card(page, workflowRef).getByRole("link", { name: "Edit" }).click();
    await expectOnboardingFormCertified(page, "edit");
    await field(page, "Status").selectOption("completed");
    await expect(page.getByText("Completion is still blocked.").or(page.getByText("Readiness preview.")).first()).toBeVisible();
    await field(page, "Notes").fill(`Phase 3B onboarding notes updated for ${workflowRef}.`);
    const updateResult = await submitAndCapture(page, `onboardings/${createResult.payload.id}`, "PATCH", async () => {
      await page.getByRole("button", { name: "Save changes" }).click();
    });
    expect(updateResult.ok).toBeTruthy();
    await expect(page).toHaveURL(/\/hr-admin\/onboardings$/);
    await expectOnboardingQueueCertified(page, workflowRef);

    await field(page, "Status").selectOption("completed");
    await page.getByRole("button", { name: "Clear filters" }).click();
    await expect(page).toHaveURL(/\/hr-admin\/onboardings$/);
    await expectOnboardingQueueCertified(page);
  });
});
