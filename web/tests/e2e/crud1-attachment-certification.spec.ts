import { expect, test, type Locator, type Page } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { employee, gotoAuthenticated, hrAdmin, requestWithBrowserSession } from "../helpers/staging-auth";

function field(scope: Page | Locator, label: string) {
  return scope.getByLabel(label, { exact: true }).or(
    scope.locator("label.form-field").filter({ hasText: label }).locator("input, select, textarea"),
  ).first();
}

function isoDateFromToday(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function isoWeekdayFromToday(days: number) {
  const date = new Date(`${isoDateFromToday(days)}T12:00:00Z`);
  while (date.getUTCDay() === 0 || date.getUTCDay() === 6) {
    date.setUTCDate(date.getUTCDate() + 1);
  }
  return date.toISOString().slice(0, 10);
}

async function selectFirstNonEmpty(locator: Locator) {
  const value = await locator.evaluate((element) =>
    Array.from((element as HTMLSelectElement).options).find((option) => option.value)?.value ?? "",
  );
  expect(value).not.toBe("");
  await locator.selectOption(value);
  return value;
}

test.describe.configure({ mode: "serial" });

test.describe("CRUD-1 attachment certification", () => {
  test("HR upload validation is truthful and responsive", async ({ page }) => {
    test.setTimeout(120_000);
    test.skip(!process.env.HRMS_API_BASE_URL, "CRUD-1 validation proof requires a live isolated API.");
    const suffix = Date.now();
    await gotoAuthenticated(page, "/hr-admin/employee-documents", hrAdmin);
    const categoryResponse = await requestWithBrowserSession(page, "/api/hr-admin/document-categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        allow_employee_upload: true,
        allow_multiple_files: true,
        category_type: "other",
        code: `crud1a-${suffix}`,
        name: `CRUD1A ${suffix}`,
        visibility_rules: { accepted_mime_types: ["application/pdf"] },
      }),
    });
    const category = JSON.parse(categoryResponse.body);
    expect(categoryResponse.status, JSON.stringify(category)).toBe(201);
    const employeesResponse = await requestWithBrowserSession(page, "/api/hr-admin/employees");
    const employeesPayload = JSON.parse(employeesResponse.body);
    const employeeId = (Array.isArray(employeesPayload) ? employeesPayload : employeesPayload.items)?.[0]?.id;
    expect(employeeId).toBeTruthy();

    await gotoAuthenticated(page, "/hr-admin/employee-documents/new", hrAdmin);
    await expectPageReady(page, "Upload employee document");
    await field(page, "Employee").selectOption(employeeId);
    await field(page, "Category").selectOption(category.id);
    await field(page, "Title").fill(`CRUD1A validation ${suffix}`);

    await page.getByRole("button", { name: "Upload document" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Review the highlighted document fields" })).toBeVisible();
    await expect(page.getByText("Attach the employee document file.")).toBeVisible();
    await expect(page.getByRole("status").filter({ hasText: "Document stored" })).toHaveCount(0);

    await field(page, "File").setInputFiles({
      name: `oversized-${suffix}.pdf`,
      mimeType: "application/pdf",
      buffer: Buffer.concat([Buffer.from("%PDF-"), Buffer.alloc(10 * 1024 * 1024)]),
    });
    await page.getByRole("button", { name: "Upload document" }).click();
    await expect(page.getByText(/File is too large/)).toBeVisible();

    await field(page, "File").setInputFiles({
      name: `corrupt-${suffix}.pdf`,
      mimeType: "application/pdf",
      buffer: Buffer.from("not a pdf"),
    });
    const [response] = await Promise.all([
      page.waitForResponse((item) => item.url().includes("/api/hr-admin/employee-documents") && item.request().method() === "POST"),
      page.getByRole("button", { name: "Upload document" }).click(),
    ]);
    expect(response.status()).toBe(400);
    await expect(page.getByRole("alert").filter({ hasText: "content does not match its filename" })).toBeVisible();
    await expect(page.getByRole("status").filter({ hasText: "Document stored" })).toHaveCount(0);

    await field(page, "File").setInputFiles({
      name: `lost-response-${suffix}.pdf`,
      mimeType: "application/pdf",
      buffer: Buffer.from(`%PDF-1.4\nCRUD-1B lost response ${suffix}\n%%EOF\n`),
    });
    let droppedCommittedResponse = false;
    await page.route("**/api/hr-admin/employee-documents", async (route) => {
      if (route.request().method() !== "POST" || droppedCommittedResponse) return route.continue();
      const committed = await route.fetch();
      expect(committed.status()).toBe(201);
      droppedCommittedResponse = true;
      await route.abort("connectionreset");
    });
    await page.getByRole("button", { name: "Upload document" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Upload outcome could not be confirmed" })).toBeVisible();
    await page.unroute("**/api/hr-admin/employee-documents");
    const [replayResponse] = await Promise.all([
      page.waitForResponse((item) => item.url().includes("/api/hr-admin/employee-documents") && item.request().method() === "POST"),
      page.getByRole("button", { name: "Upload document" }).click(),
    ]);
    expect(replayResponse.status()).toBe(201);
    expect(replayResponse.headers()["idempotency-replayed"]).toBe("true");
    await expect(page.getByRole("status").filter({ hasText: "Document stored" })).toBeVisible();

    for (const viewport of [{ width: 820, height: 1180 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(viewport);
      await expect(page.getByRole("status").filter({ hasText: "Document stored" })).toBeVisible();
      await expectNoHorizontalOverflow(page);
    }
  });

  test("ESS document and leave evidence persist through real browser uploads", async ({ page }) => {
    test.setTimeout(120_000);
    test.skip(!process.env.HRMS_API_BASE_URL, "CRUD-1 persistence proof requires a live isolated API.");
    const suffix = Date.now();
    const categoryCode = `crud1-${suffix}`;
    const documentTitle = `CRUD1 ESS evidence ${suffix}`;

    await gotoAuthenticated(page, "/hr-admin/employee-documents", hrAdmin);
    const categoryResponse = await requestWithBrowserSession(page, "/api/hr-admin/document-categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        allow_employee_upload: true,
        allow_multiple_files: true,
        category_type: "other",
        code: categoryCode,
        metadata_schema: { owner: "crud1" },
        name: `CRUD1 ${suffix}`,
        visibility_rules: { accepted_mime_types: ["application/pdf"] },
      }),
    });
    const categoryPayload = JSON.parse(categoryResponse.body || "{}");
    expect(categoryResponse.status, JSON.stringify(categoryPayload)).toBe(201);
    const requirementResponse = await requestWithBrowserSession(page, "/api/hr-admin/document-requirements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category_id: categoryPayload.id,
        is_active: true,
        is_mandatory: true,
        priority: 10,
        required_within_days_of_joining: 0,
      }),
    });
    expect(requirementResponse.status, requirementResponse.body).toBe(201);

    await gotoAuthenticated(page, "/ess/documents", employee);
    await expectPageReady(page, "Documents");
    await page.getByRole("button", { name: "Upload document" }).first().click();
    const uploadDialog = page.getByRole("dialog", { name: /Upload document|Replace document/ });
    await expect(uploadDialog).toBeVisible();
    await field(uploadDialog, "Category").selectOption({ label: `CRUD1 ${suffix}` });
    await field(uploadDialog, "Title").fill(documentTitle);
    await field(uploadDialog, "Document number").fill(`CRUD1-${suffix}`);
    await field(uploadDialog, "File").setInputFiles({
      name: `unicode-evidence-${suffix}.pdf`,
      mimeType: "application/pdf",
      buffer: Buffer.from(`%PDF-1.4\n% CRUD-1 ESS evidence ${suffix}\n%%EOF\n`),
    });
    await expect(uploadDialog.getByText(/Selected:/)).toContainText(`unicode-evidence-${suffix}.pdf`);

    const [documentResponse] = await Promise.all([
      page.waitForResponse((response) => response.url().includes("/api/me/employee-documents") && response.request().method() === "POST"),
      uploadDialog.getByRole("button", { name: "Submit for review" }).click(),
    ]);
    const documentPayload = await documentResponse.json().catch(() => ({}));
    expect(documentResponse.ok(), JSON.stringify(documentPayload)).toBeTruthy();
    await expect(uploadDialog).toHaveCount(0);
    await expect(page.getByRole("main").getByRole("status").filter({ hasText: "Document uploaded successfully." })).toBeVisible();
    await page.reload();
    await expect(page.getByText(documentTitle, { exact: false }).first()).toBeVisible();
    const documentCard = page.locator("article, tr").filter({ hasText: documentTitle }).first();
    await documentCard.getByRole("button", { name: /Review|View/ }).click();
    const documentDetail = page.getByRole("dialog", { name: /Document detail|CRUD1/ });
    await expect(documentDetail).toBeVisible();
    const download = documentDetail.getByRole("link", { name: /Download|Download file/ }).first();
    await expect(download).toBeVisible();
    const downloadResponse = await requestWithBrowserSession(page, await download.getAttribute("href") as string);
    expect(downloadResponse.status).toBe(200);
    expect(downloadResponse.body).toBe(`%PDF-1.4\n% CRUD-1 ESS evidence ${suffix}\n%%EOF\n`);

    await gotoAuthenticated(page, "/ess/leave", employee);
    await expectPageReady(page, "Leave");
    await page.getByRole("button", { name: "Apply leave" }).click();
    const leaveDialog = page.getByRole("dialog", { name: "Apply leave" });
    await expect(leaveDialog).toBeVisible();
    await selectFirstNonEmpty(field(leaveDialog, "Leave type"));
    const leaveDate = isoWeekdayFromToday(14);
    await field(leaveDialog, "Start date").fill(leaveDate);
    await field(leaveDialog, "End date").fill(leaveDate);
    await field(leaveDialog, "Evidence file").setInputFiles({
      name: `leave-evidence-${suffix}.pdf`,
      mimeType: "application/pdf",
      buffer: Buffer.from(`%PDF-1.4\n% CRUD-1 leave evidence ${suffix}\n%%EOF\n`),
    });
    await field(leaveDialog, "Evidence reference").fill(`CRUD1-${suffix}`);
    await field(leaveDialog, "Reason for leave").fill(`CRUD-1 attachment certification ${suffix}`);
    await expect(leaveDialog.getByText("Evidence selected")).toBeVisible();

    const [leaveResponse] = await Promise.all([
      page.waitForResponse((response) => response.url().includes("/api/me/leave-requests") && response.request().method() === "POST"),
      leaveDialog.getByRole("button", { name: "Submit leave" }).click(),
    ]);
    const leavePayload = await leaveResponse.json().catch(() => ({}));
    expect(leaveResponse.ok(), JSON.stringify(leavePayload)).toBeTruthy();
    await expect(leaveDialog).toHaveCount(0);
    await page.reload();
    await expectPageReady(page, "Leave");
    await expect(page.getByRole("heading", { name: "Leave requests" })).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    await expectNoHorizontalOverflow(page);
  });
});
