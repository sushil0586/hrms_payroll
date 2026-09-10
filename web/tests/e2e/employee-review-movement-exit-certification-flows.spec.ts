import { expect, test, type Locator, type Page } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated, hrAdmin } from "../helpers/staging-auth";

function uniqueRef(prefix: string) {
  return `PW_${prefix}_${Date.now()}`;
}

function field(scope: Page | Locator, label: string, index = 0) {
  return scope.locator("label.form-field").filter({ hasText: label }).locator("input, select, textarea").nth(index);
}

function detailCheckbox(scope: Page | Locator, label: string) {
  return scope.locator("label.detail-row").filter({ hasText: label }).locator("input[type='checkbox']").first();
}

function card(page: Page, text: string | RegExp) {
  return page.locator("article.record-card").filter({ hasText: text }).first();
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

async function createDisposableEmployee(page: Page, prefix: string) {
  const employeeCode = uniqueRef(prefix);
  const loginResponse = await page.request.post("/api/auth/login", {
    data: {
      identifier: hrAdmin.username,
      password: hrAdmin.password,
    },
  });
  expect(loginResponse.ok()).toBeTruthy();
  const response = await page.request.post("/api/hr-admin/employees", {
    data: {
      employee_code: employeeCode,
      employment_status: "active",
      first_name: prefix.replace(/_/g, " "),
      last_name: "Certified",
      work_email: `${employeeCode.toLowerCase()}@example.test`,
    },
  });
  expect(response.ok()).toBeTruthy();
  return employeeCode;
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

async function expectDocumentReviewCertified(page: Page) {
  await expectPageReady(page, "Review employee document");
  await expect(page.getByRole("link", { name: "Back to employee documents" })).toBeVisible();
  for (const heading of ["Document review and verification", "Document context", "Review details", "Version history", "Review history"]) {
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
  }
  for (const label of ["Title", "Status", "Verification status", "Document number", "Issued on", "Expires on", "Re-upload requested", "Rejection reason or review note"]) {
    await expect(field(page, label), `${label} review control should be visible`).toBeVisible();
  }
  await expectSelectHasOptions(field(page, "Status"));
  await expectSelectHasOptions(field(page, "Verification status"));
  await expect(page.getByRole("button", { name: "Save review" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Cancel" })).toBeVisible();
  await expectNoHorizontalOverflow(page);
}

async function expectMovementFormCertified(page: Page, mode: "create" | "edit") {
  await expectPageReady(page, mode === "create" ? "Create movement" : "Edit movement");
  await expect(page.getByRole("link", { name: "Back to movements" })).toBeVisible();
  await expect(page.getByRole("heading", { name: mode === "create" ? "Create movement event" : "Edit movement event" })).toBeVisible();
  for (const heading of ["Movement context", "Department and designation change", "Manager and owner routing", "Current snapshot"]) {
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
  }
  for (const label of [
    "Employee",
    "Movement type",
    "Status",
    "Effective date",
    "Reason",
    "Workflow reference",
    "From department",
    "To department",
    "From designation",
    "To designation",
    "From manager",
    "To manager",
    "Current snapshot JSON",
  ]) {
    await expect(field(page, label), `${label} movement control should be visible`).toBeVisible();
  }
  for (const label of ["Employee", "Movement type", "Status", "From department", "To department", "From designation", "To designation", "From manager", "To manager"]) {
    await expectSelectHasOptions(field(page, label));
  }
  await expect(page.getByRole("button", { name: mode === "create" ? "Create movement" : "Save changes" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Cancel" })).toBeVisible();
  await expectNoHorizontalOverflow(page);
}

async function expectMovementQueueCertified(page: Page, workflowRef?: string) {
  await expectPageReady(page, /Movement operations/);
  for (const metric of ["Movement records", "Rows on current page", "Movement types", "Lifecycle states"]) {
    await expect(page.locator(".metric-tile, .metric-tile-soft").filter({ hasText: metric }).first()).toBeVisible();
  }
  await expect(page.getByRole("link", { name: "Create movement" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to lifecycle" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Movements" })).toBeVisible();
  for (const label of ["Search", "Status", "Movement type", "Owner", "Rows per page", "Bulk owner", "Bulk status"]) {
    await expect(field(page, label), `${label} movement queue control should be visible`).toBeVisible();
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

async function expectExitFormCertified(page: Page, mode: "create" | "edit") {
  await expectPageReady(page, mode === "create" ? "Create exit record" : "Edit exit record");
  await expect(page.getByRole("link", { name: "Back to exits" })).toBeVisible();
  for (const heading of ["Core details", "Notice and separation dates", "Clearance and handover", "Clearance items", "Flags"]) {
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
  }
  for (const label of [
    "Employee",
    "Status",
    "Resignation date",
    "Exit reason",
    "Workflow reference",
    "Exit reason detail",
    "Notice start",
    "Notice end",
    "Proposed LWD",
    "Approved LWD",
    "Actual exit date",
    "Lifecycle template trigger",
    "Clearance plan notes",
    "Handover notes",
  ]) {
    await expect(field(page, label), `${label} exit control should be visible`).toBeVisible();
  }
  await expectSelectHasOptions(field(page, "Employee"));
  await expectSelectHasOptions(field(page, "Status"));
  for (const label of ["Regrettable", "Rehire eligible"]) {
    await expect(detailCheckbox(page, label), `${label} flag should be visible`).toBeVisible();
  }
  await expect(page.getByRole("button", { name: "Add clearance item" })).toBeVisible();
  await expect(page.getByText("Clearance preview.")).toBeVisible();
  await expect(page.getByRole("button", { name: mode === "create" ? "Create exit" : "Save changes" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Cancel" })).toBeVisible();
  await expectNoHorizontalOverflow(page);
}

async function expectExitQueueCertified(page: Page, workflowRef?: string) {
  await expectPageReady(page, "Exit operations");
  for (const metric of ["Queue size", "Page items", "Rehire eligible"]) {
    await expect(page.locator(".metric-tile, .metric-tile-soft").filter({ hasText: metric }).first()).toBeVisible();
  }
  await expect(page.getByRole("link", { name: "Create exit" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to lifecycle" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Exits" })).toBeVisible();
  for (const label of ["Search", "Status", "Rehire eligibility", "Rows per page"]) {
    await expect(field(page, label), `${label} exit queue control should be visible`).toBeVisible();
  }
  for (const action of ["Apply filters", "Clear filters"]) {
    await expect(page.getByRole("button", { name: action })).toBeVisible();
  }
  if (workflowRef) {
    await expect(card(page, workflowRef)).toBeVisible();
    await expect(card(page, workflowRef).getByRole("link", { name: "Edit" })).toBeVisible();
  }
  await expectNoHorizontalOverflow(page);
}

test.describe("Phase 3C employee review, movement, and exit certification", () => {
  test("employee document review page supports metadata, verification, re-upload, history, and queue return", async ({ page }) => {
    test.setTimeout(3 * 60 * 1000);
    const title = uniqueRef("DOC_REVIEW");
    const employeeCode = await createDisposableEmployee(page, "DOC_REVIEW_EMP");

    await gotoAuthenticated(page, "/hr-admin/employee-documents/new");
    await page.reload();
    await selectOptionContaining(field(page, "Employee"), employeeCode);
    await selectFirstNonEmptyOption(field(page, "Category"));
    await field(page, "Title").fill(title);
    await field(page, "Document number").fill(`${title}-NO`);
    await field(page, "Issued on").fill("2026-06-01");
    await field(page, "Expires on").fill("2027-06-01");
    await field(page, "File").setInputFiles({
      name: `${title}.pdf`,
      mimeType: "application/pdf",
      buffer: Buffer.from(`%PDF-1.4\n% Phase 3C review upload ${title}\n%%EOF\n`),
    });
    const createResult = await submitAndCapture<{ id: string }>(page, "employee-documents", "POST", async () => {
      await page.getByRole("button", { name: "Upload document" }).click();
    });
    expect(createResult.ok).toBeTruthy();

    await card(page, title).getByRole("link", { name: "Review", exact: true }).click();
    await expectDocumentReviewCertified(page);
    await field(page, "Title").fill(`${title}_VERIFIED`);
    await selectFirstNonEmptyOption(field(page, "Status"));
    await selectFirstNonEmptyOption(field(page, "Verification status"));
    await field(page, "Document number").fill(`${title}-UPDATED`);
    await field(page, "Issued on").fill("2026-06-02");
    await field(page, "Expires on").fill("2027-06-02");
    await field(page, "Re-upload requested").selectOption("true");
    await field(page, "Rejection reason or review note").fill("Phase 3C review decision captured through browser.");
    const updateResult = await submitAndCapture(page, `employee-documents/${createResult.payload.id}`, "PATCH", async () => {
      await page.getByRole("button", { name: "Save review" }).click();
    });
    expect(updateResult.ok).toBeTruthy();
    await expect(page).toHaveURL(/\/hr-admin\/employee-documents$/);
    await field(page, "Search").fill(`${title}_VERIFIED`);
    await Promise.all([
      page.waitForURL((url) => url.searchParams.get("q") === `${title}_VERIFIED`),
      page.getByRole("button", { name: "Apply filters" }).click(),
    ]);
    await expect(card(page, `${title}_VERIFIED`)).toBeVisible();
  });

  test("movement create, edit, queue filters, selection, owner bulk, and status bulk are certified", async ({ page }) => {
    test.setTimeout(3 * 60 * 1000);
    const workflowRef = uniqueRef("MOV");
    const employeeCode = await createDisposableEmployee(page, "MOV_EMP");

    await gotoAuthenticated(page, "/hr-admin/movements/new");
    await page.reload();
    await expectMovementFormCertified(page, "create");
    await page.getByRole("button", { name: "Create movement" }).click();
    await expect(page.getByText("Unable to save movement.").or(page.getByText(/employee/i)).first()).toBeVisible();
    await selectOptionContaining(field(page, "Employee"), employeeCode);
    await selectFirstNonEmptyOption(field(page, "Movement type"));
    await field(page, "Status").selectOption("pending");
    await field(page, "Effective date").fill("2026-07-01");
    await field(page, "Reason").fill("Phase 3C certified promotion");
    await field(page, "Workflow reference").fill(workflowRef);
    await selectFirstNonEmptyOption(field(page, "From department"));
    await selectFirstNonEmptyOption(field(page, "To department"));
    await selectFirstNonEmptyOption(field(page, "From designation"));
    await selectFirstNonEmptyOption(field(page, "To designation"));
    await selectFirstNonEmptyOption(field(page, "From manager"));
    await selectFirstNonEmptyOption(field(page, "To manager"));
    await field(page, "Current snapshot JSON").fill("{not valid json");
    await page.getByRole("button", { name: "Create movement" }).click();
    await expect(page.getByText("Current snapshot must be valid JSON.")).toBeVisible();
    await field(page, "Current snapshot JSON").fill(JSON.stringify({ department: "Sales", grade: "M1" }, null, 2));
    const createResult = await submitAndCapture<{ id: string }>(page, "movements", "POST", async () => {
      await page.getByRole("button", { name: "Create movement" }).click();
    });
    expect(createResult.ok).toBeTruthy();
    await expect(page).toHaveURL(/\/hr-admin\/movements$/);
    await expectMovementQueueCertified(page, workflowRef);

    await field(page, "Search").fill(workflowRef);
    await Promise.all([
      page.waitForURL((url) => url.searchParams.get("q") === workflowRef),
      page.getByRole("button", { name: "Apply filters" }).click(),
    ]);
    await expectMovementQueueCertified(page, workflowRef);
    await page.getByRole("button", { name: "Select page" }).click();
    await expect(page.getByRole("button", { name: /Assign owner \(1\)/ })).toBeVisible();
    await selectFirstNonEmptyOption(field(page, "Bulk owner"));
    await expect((await submitAndCapture(page, "lifecycle-owner-bulk-actions", "POST", async () => {
      await page.getByRole("button", { name: /Assign owner/ }).click();
    })).ok).toBeTruthy();
    await page.getByRole("button", { name: "Select page" }).click();
    await field(page, "Bulk status").selectOption("cancelled");
    await expect((await submitAndCapture(page, "lifecycle-status-bulk-actions", "POST", async () => {
      await page.getByRole("button", { name: /Set status/ }).click();
    })).ok).toBeTruthy();

    await card(page, workflowRef).getByRole("link", { name: "Edit" }).click();
    await expectMovementFormCertified(page, "edit");
    await field(page, "Reason").fill("Phase 3C certified movement edit");
    await field(page, "Status").selectOption("cancelled");
    const updateResult = await submitAndCapture(page, `movements/${createResult.payload.id}`, "PATCH", async () => {
      await page.getByRole("button", { name: "Save changes" }).click();
    });
    expect(updateResult.ok).toBeTruthy();
    await expect(page).toHaveURL(/\/hr-admin\/movements$/);
    await field(page, "Movement type").selectOption("all");
    await page.getByRole("button", { name: "Clear filters" }).click();
    await expect(page).toHaveURL(/\/hr-admin\/movements$/);
    await expectMovementQueueCertified(page);
  });

  test("exit create, edit, queue filters, clearance items, flags, and completion guard are certified", async ({ page }) => {
    test.setTimeout(3 * 60 * 1000);
    const workflowRef = uniqueRef("EXIT");
    const employeeCode = await createDisposableEmployee(page, "EXIT_EMP");

    await gotoAuthenticated(page, "/hr-admin/exits/new");
    await page.reload();
    await expectExitFormCertified(page, "create");
    await selectOptionContaining(field(page, "Employee"), employeeCode);
    await field(page, "Status").selectOption("pending_approval");
    await field(page, "Resignation date").fill("2026-08-01");
    await field(page, "Exit reason").fill("Phase 3C certified resignation");
    await field(page, "Workflow reference").fill(workflowRef);
    await field(page, "Exit reason detail").fill("Full exit detail field certified.");
    await field(page, "Notice start").fill("2026-08-01");
    await field(page, "Notice end").fill("2026-08-31");
    await field(page, "Proposed LWD").fill("2026-08-31");
    await field(page, "Approved LWD").fill("2026-08-31");
    await field(page, "Actual exit date").fill("2026-09-01");
    await field(page, "Clearance plan notes").fill("Clearance notes certified.");
    await field(page, "Handover notes").fill("Handover notes certified.");
    await detailCheckbox(page, "Regrettable").check();
    await detailCheckbox(page, "Rehire eligible").uncheck();

    await page.getByRole("button", { name: "Add clearance item" }).click();
    const clearanceCard = page.locator("article.record-card").filter({ hasText: "exit-clearance-1" }).first();
    await expect(clearanceCard).toBeVisible();
    for (const label of ["Code", "Label", "Owner", "Escalation owner", "Due on", "Escalate after days", "Notes"]) {
      await expect(field(clearanceCard, label), `${label} clearance control should be visible`).toBeVisible();
    }
    for (const label of ["Required", "Blocking", "Done", "Auto reassign on escalation"]) {
      await expect(detailCheckbox(clearanceCard, label), `${label} clearance flag should be visible`).toBeVisible();
    }
    await field(clearanceCard, "Label").fill("Recover assigned assets");
    await selectFirstNonEmptyOption(field(clearanceCard, "Owner"));
    await selectFirstNonEmptyOption(field(clearanceCard, "Escalation owner"));
    await field(clearanceCard, "Due on").fill("2026-08-20");
    await field(clearanceCard, "Escalate after days").fill("3");
    await field(clearanceCard, "Notes").fill("Clearance item certified through browser.");
    await detailCheckbox(clearanceCard, "Done").check();
    await expect(page.getByText("1/1 complete, 0 open, 0 overdue.")).toBeVisible();
    await page.getByRole("button", { name: "Add clearance item" }).click();
    await page.locator("article.record-card").filter({ hasText: "exit-clearance-2" }).getByRole("button", { name: "Remove" }).click();
    await expect(page.locator("article.record-card").filter({ hasText: "exit-clearance-2" })).toHaveCount(0);

    const createResult = await submitAndCapture<{ id: string }>(page, "exits", "POST", async () => {
      await page.getByRole("button", { name: "Create exit" }).click();
    });
    expect(createResult.ok).toBeTruthy();
    await expect(page).toHaveURL(/\/hr-admin\/exits$/);
    await expectExitQueueCertified(page, workflowRef);

    await field(page, "Search").fill(workflowRef);
    await field(page, "Rehire eligibility").selectOption("no");
    await Promise.all([
      page.waitForURL((url) => url.searchParams.get("q") === workflowRef && url.searchParams.get("rehire_eligible") === "no"),
      page.getByRole("button", { name: "Apply filters" }).click(),
    ]);
    await expectExitQueueCertified(page, workflowRef);

    await card(page, workflowRef).getByRole("link", { name: "Edit" }).click();
    await expectExitFormCertified(page, "edit");
    await field(page, "Status").selectOption("completed");
    await field(page, "Handover notes").fill("Handover notes updated in edit mode.");
    await detailCheckbox(page, "Rehire eligible").check();
    const updateResult = await submitAndCapture(page, `exits/${createResult.payload.id}`, "PATCH", async () => {
      await page.getByRole("button", { name: "Save changes" }).click();
    });
    expect(updateResult.ok).toBeTruthy();
    await expect(page).toHaveURL(/\/hr-admin\/exits$/);
    await page.getByRole("button", { name: "Clear filters" }).click();
    await expect(page).toHaveURL(/\/hr-admin\/exits$/);
    await expectExitQueueCertified(page);
  });
});
