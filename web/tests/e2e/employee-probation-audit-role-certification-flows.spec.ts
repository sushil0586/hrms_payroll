import { expect, test, type Locator, type Page } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated, hrAdmin } from "../helpers/staging-auth";

function uniqueRef(prefix: string) {
  return `PW_${prefix}_${Date.now()}`;
}

function field(scope: Page | Locator, label: string, index = 0) {
  return scope.locator("label.form-field").filter({ hasText: label }).locator("input, select, textarea").nth(index);
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
      first_name: "Probation",
      last_name: "Certified",
      work_email: `${employeeCode.toLowerCase()}@example.test`,
      date_of_joining: "2026-01-01",
      probation_end_date: "2026-09-30",
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

async function expectProbationFormCertified(page: Page, mode: "create" | "edit") {
  await expectPageReady(page, mode === "create" ? "Create probation review" : "Edit probation review");
  await expect(page.getByRole("link", { name: "Back to probation reviews" })).toBeVisible();
  await expect(page.locator("form").getByRole("heading", { name: mode === "create" ? "Create probation review" : "Edit probation review" })).toBeVisible();
  for (const heading of ["Review schedule", "Extension and ownership", "Remarks"]) {
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
  }
  for (const label of ["Employee", "Review date", "Probation end date", "Decision", "Extension end date", "Reviewer", "Workflow reference", "Remarks"]) {
    await expect(field(page, label), `${label} probation control should be visible`).toBeVisible();
  }
  for (const label of ["Employee", "Decision", "Reviewer"]) {
    await expectSelectHasOptions(field(page, label));
  }
  await expect(page.getByRole("button", { name: mode === "create" ? "Create probation review" : "Save changes" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Cancel" })).toBeVisible();
  await expectNoHorizontalOverflow(page);
}

async function expectProbationQueueCertified(page: Page, workflowRef?: string) {
  await expectPageReady(page, /Probation reviews/);
  for (const metric of ["Probation reviews", "Rows on current page", "Decision states", "Assignable owners"]) {
    await expect(page.locator(".metric-tile, .metric-tile-soft").filter({ hasText: metric }).first()).toBeVisible();
  }
  await expect(page.getByRole("link", { name: "Create probation review" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to lifecycle" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Probation reviews", exact: true })).toBeVisible();
  for (const label of ["Search", "Decision", "Owner", "Rows per page", "Bulk owner", "Bulk decision"]) {
    await expect(field(page, label), `${label} probation queue control should be visible`).toBeVisible();
  }
  for (const action of ["Apply filters", "Clear filters", "Select page", /Assign owner/, /Clear owner/, /Set decision/]) {
    await expect(page.getByRole("button", { name: action }).first()).toBeVisible();
  }
  if (workflowRef) {
    await expect(card(page, workflowRef)).toBeVisible();
    await expect(card(page, workflowRef).getByRole("link", { name: "Edit" })).toBeVisible();
  }
  await expectNoHorizontalOverflow(page);
}

async function expectAuditCenterCertified(page: Page) {
  await expectPageReady(page, "Audit center");
  for (const metric of ["Recent events", "Approval actions", "Document reviews", "Onboarding actions", "Exit actions", "Delivery logs"]) {
    await expect(page.locator(".metric-tile, .metric-tile-soft").filter({ hasText: metric }).first()).toBeVisible();
  }
  await expect(page.getByRole("link", { name: "Reports", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Notifications", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Audit filters" })).toBeVisible();
  await expect(field(page, "Search")).toBeVisible();
  await expect(field(page, "Source")).toBeVisible();
  await expectSelectHasOptions(field(page, "Source"), 5);
  await expect(page.getByRole("button", { name: "Apply filters" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Clear filters" })).toBeVisible();
  await expect(page.locator("article.record-card, .card.panel").last()).toBeVisible();
  await expectNoHorizontalOverflow(page);
}

async function expectEssCertified(page: Page) {
  await expectPageReady(page, "Self service");
  for (const action of ["Home", "Open MSS"]) {
    await expect(page.getByRole("link", { name: action })).toBeVisible();
  }
  await expect(page.locator("main").getByRole("button", { name: "Sign out" })).toBeVisible();
  for (const metric of ["Pending leave requests", "Pending regularizations", "Hours this month", "Today"]) {
    await expect(page.locator(".metric-tile, .metric-tile-soft").filter({ hasText: metric }).first()).toBeVisible();
  }
  for (const heading of ["Profile snapshot", "Attendance today", "Leave balances", "Leave request history", "Leave request detail", "Regularization history", "Regularization detail"]) {
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
  }
  for (const tab of ["all", "pending", "approved", "rejected"]) {
    await expect(page.getByRole("link", { name: new RegExp(tab, "i") }).first()).toBeVisible();
  }
  await expectNoHorizontalOverflow(page);
}

async function expectMssCertified(page: Page) {
  await expectPageReady(page, "Manager inbox");
  for (const action of ["Home", "Open ESS"]) {
    await expect(page.getByRole("link", { name: action })).toBeVisible();
  }
  await expect(page.locator("main").getByRole("button", { name: "Sign out" })).toBeVisible();
  for (const metric of ["Team members", "Leave approvals", "Regularizations", "Exceptions today"]) {
    await expect(page.locator(".metric-tile, .metric-tile-soft").filter({ hasText: metric }).first()).toBeVisible();
  }
  await expect(page.getByRole("heading", { name: "Approval queues" })).toBeVisible();
  const approvalTabbar = page.locator(".tabbar").filter({ hasText: "Leave" }).filter({ hasText: "Attendance" }).first();
  await expect(approvalTabbar.getByRole("link", { name: /Leave/ })).toBeVisible();
  await expect(approvalTabbar.getByRole("link", { name: /Attendance/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Leave approvals" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Leave approval detail" })).toBeVisible();
  await approvalTabbar.getByRole("link", { name: /Attendance/ }).click();
  await expect(page).toHaveURL(/queue=attendance/);
  await expect(page.getByRole("heading", { name: "Attendance regularizations" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Regularization detail" })).toBeVisible();
  await expectNoHorizontalOverflow(page);
}

test.describe("Phase 3D probation, audit, ESS, and MSS certification", () => {
  test("probation review create, extension guard, edit, queue filters, and bulk actions are certified", async ({ page }) => {
    test.setTimeout(4 * 60 * 1000);
    const workflowRef = uniqueRef("PROB");
    const employeeCode = await createDisposableEmployee(page, "PROB_EMP");

    await gotoAuthenticated(page, "/hr-admin/probation-reviews/new");
    await page.reload();
    await expectProbationFormCertified(page, "create");
    const invalidCreate = await submitAndCapture(page, "probation-reviews", "POST", async () => {
      await page.getByRole("button", { name: "Create probation review" }).click();
    });
    expect(invalidCreate.ok).toBeFalsy();
    await expect(page.getByText("Save failed.")).toBeVisible();

    await selectOptionContaining(field(page, "Employee"), employeeCode);
    await field(page, "Review date").fill("2026-09-15");
    await field(page, "Probation end date").fill("2026-09-30");
    await field(page, "Decision").selectOption("extend");
    await expect(page.getByText("Extension is incomplete.")).toBeVisible();
    await field(page, "Extension end date").fill("2026-12-31");
    await selectFirstNonEmptyOption(field(page, "Reviewer"));
    await field(page, "Workflow reference").fill(workflowRef);
    await field(page, "Remarks").fill("Phase 3D probation review created through browser.");

    const createResult = await submitAndCapture<{ id: string }>(page, "probation-reviews", "POST", async () => {
      await page.getByRole("button", { name: "Create probation review" }).click();
    });
    expect(createResult.ok).toBeTruthy();
    await expect(page).toHaveURL(/\/hr-admin\/probation-reviews$/);
    await expectProbationQueueCertified(page, workflowRef);

    await field(page, "Search").fill(workflowRef);
    await Promise.all([
      page.waitForURL((url) => url.searchParams.get("q") === workflowRef),
      page.getByRole("button", { name: "Apply filters" }).click(),
    ]);
    await expectProbationQueueCertified(page, workflowRef);
    await page.getByRole("button", { name: "Select page" }).click();
    await expect(page.getByRole("button", { name: /Assign owner \(1\)/ })).toBeVisible();
    await selectFirstNonEmptyOption(field(page, "Bulk owner"));
    await expect((await submitAndCapture(page, "lifecycle-owner-bulk-actions", "POST", async () => {
      await page.getByRole("button", { name: /Assign owner/ }).click();
    })).ok).toBeTruthy();
    await page.getByRole("button", { name: "Select page" }).click();
    await field(page, "Bulk decision").selectOption("separate");
    await expect((await submitAndCapture(page, "lifecycle-status-bulk-actions", "POST", async () => {
      await page.getByRole("button", { name: /Set decision/ }).click();
    })).ok).toBeTruthy();

    await card(page, workflowRef).getByRole("link", { name: "Edit" }).click();
    await expectProbationFormCertified(page, "edit");
    await field(page, "Review date").fill("2026-10-01");
    await field(page, "Decision").selectOption("confirm");
    await field(page, "Remarks").fill("Phase 3D probation review updated through browser.");
    const updateResult = await submitAndCapture(page, `probation-reviews/${createResult.payload.id}`, "PATCH", async () => {
      await page.getByRole("button", { name: "Save changes" }).click();
    });
    expect(updateResult.ok).toBeTruthy();
    await expect(page).toHaveURL(/\/hr-admin\/probation-reviews$/);
    await page.getByRole("button", { name: "Clear filters" }).click();
    await expect(page).toHaveURL(/\/hr-admin\/probation-reviews$/);
    await expectProbationQueueCertified(page);
  });

  test("audit center filters and source drill links are certified", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/audit");
    await expectAuditCenterCertified(page);
    await field(page, "Search").fill("Phase 3");
    await field(page, "Source").selectOption("document_review");
    await Promise.all([
      page.waitForURL((url) => url.searchParams.get("q") === "Phase+3" || url.searchParams.get("source") === "document_review").catch(() => undefined),
      page.getByRole("button", { name: "Apply filters" }).click(),
    ]);
    await expectPageReady(page, "Audit center");
    await expect(field(page, "Source")).toHaveValue("document_review");
    await page.getByRole("link", { name: "Clear filters" }).click();
    await expect(page).toHaveURL(/\/hr-admin\/audit$/);
    await expectAuditCenterCertified(page);
  });

  test("ESS self-service workspace and MSS manager inbox role surfaces are certified", async ({ page }) => {
    await gotoAuthenticated(page, "/ess");
    await expectEssCertified(page);
    await gotoAuthenticated(page, "/mss/approvals");
    await expectMssCertified(page);
  });
});
