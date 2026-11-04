import { execFileSync } from "node:child_process";
import path from "node:path";

import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { cleanupIsolatedQaWorkspace, provisionIsolatedQaWorkspace, workspacePersona, type IsolatedQaWorkspace } from "../helpers/isolated-qa-workspace";

let fixture: IsolatedQaWorkspace;
const repo = path.resolve(__dirname, "../../..");

test.beforeAll(async ({}, testInfo) => {
  fixture = await provisionIsolatedQaWorkspace(testInfo);
  execFileSync(path.join(repo, ".venv/bin/python"), ["backend/manage.py", "shell", "-c", "exec(open('web/tests/document-certification/fixtures.py').read())"], {
    cwd: repo,
    env: { ...process.env, QA_DOCUMENT_CERT_MANIFEST: fixture.manifestPath, QA_DOCUMENT_CERT_SEED_REF: fixture.seedRef },
  });
});

test.afterAll(async () => cleanupIsolatedQaWorkspace(fixture));

test.beforeEach(async ({ page }) => {
  const employee = workspacePersona(fixture, "employee");
  const response = await page.request.post("/api/auth/login", { data: { identifier: employee.username, password: employee.password } });
  expect(response.status()).toBe(200);
});

async function openDocuments(page: import("@playwright/test").Page, suffix = "") {
  const response = await page.goto(`/ess/documents${suffix}`, { waitUntil: "domcontentloaded" });
  expect(response?.status()).toBe(200);
  await expectPageReady(page, "Documents");
  await expect(page.getByRole("group", { name: "Employee documents" })).toHaveAttribute("data-hydrated", "true");
}

test("task-owned ESS document workspace loads, validates, and remains responsive", async ({ page }) => {
  await openDocuments(page);
  await expect(page.getByRole("heading", { name: "Required documents" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Document history" })).toBeVisible();
  await expect(page.getByText(/matching documents/).first()).toBeVisible();
  await page.getByRole("button", { name: "Upload document" }).first().click();
  const dialog = page.getByRole("dialog", { name: /(?:Upload|Replace) document/ });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Submit for review" })).toBeDisabled();
  await dialog.getByLabel("Title").fill("Unsafe certification upload");
  await dialog.getByLabel("Expires on").fill("2027-12-31");
  await dialog.getByLabel("File").setInputFiles({ name: "unsafe.exe", mimeType: "application/x-msdownload", buffer: Buffer.from("MZ") });
  await dialog.getByRole("button", { name: "Submit for review" }).click();
  await expect(dialog.getByText("This category accepts: application/pdf.")).toBeVisible();
  await expect(dialog.getByRole("alert")).toContainText("Review the highlighted document fields and try again.");
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 390, height: 844 });
  await expectNoHorizontalOverflow(page);
});

test("every ESS document sort option applies through the scoped browser workflow", async ({ page }) => {
  await openDocuments(page, "?page_size=25");
  const sort = page.getByLabel("Sort by");
  const options = await sort.locator("option").evaluateAll((items) => items.map((item) => (item as HTMLOptionElement).value));
  expect(options).toEqual([
    "uploaded_desc", "uploaded_asc", "title_asc", "title_desc", "category_asc",
    "category_desc", "status_asc", "status_desc", "expiry_asc", "expiry_desc",
  ]);
  for (const value of options) {
    await sort.selectOption(value);
    const response = page.waitForResponse((item) => item.url().includes("/api/me/document-center") && item.request().method() === "GET");
    await page.getByRole("button", { name: "Apply filters" }).click();
    expect((await response).status()).toBe(200);
    await expect(page).toHaveURL(new RegExp(`sort=${value}`));
    await expect(page.getByText(/25 on this page/)).toBeVisible();
  }
});

test("every HR document queue sort option applies through the scoped browser workflow", async ({ page }) => {
  test.setTimeout(60_000);
  const hrAdmin = workspacePersona(fixture, "hr_admin");
  const loginResponse = await page.request.post("/api/auth/login", { data: { identifier: hrAdmin.username, password: hrAdmin.password } });
  expect(loginResponse.status()).toBe(200);
  const response = await page.goto("/hr-admin/employee-documents?page_size=25", { waitUntil: "domcontentloaded" });
  expect(response?.status()).toBe(200);
  await expectPageReady(page, "Employee document review");
  await page.getByText("More filters").click();
  const sort = page.getByLabel("Sort by");
  const options = await sort.locator("option").evaluateAll((items) => items.map((item) => (item as HTMLOptionElement).value));
  expect(options).toEqual([
    "uploaded_desc", "uploaded_asc", "employee_asc", "employee_desc", "title_asc", "title_desc",
    "category_asc", "category_desc", "status_asc", "status_desc", "expiry_asc", "expiry_desc",
  ]);
  for (const value of options) {
    if (!(await sort.isVisible())) await page.getByText("More filters").click();
    await sort.selectOption(value);
    const apiResponse = page.waitForResponse((item) => item.url().includes("/api/hr-admin/employee-documents/workspace") && item.request().method() === "GET");
    await page.getByRole("button", { name: "Apply filters" }).click();
    expect((await apiResponse).status()).toBe(200);
    await expect(page).toHaveURL(new RegExp(`sort=${value}`));
    await expect(page.getByText(/on this page/).first()).toBeVisible();
  }
});

test("ESS document sorting is durable across pages and empty results hide pagination", async ({ page }) => {
  await openDocuments(page, "?sort=title_asc&page_size=25");
  const firstPageTitles = await page.locator('table[aria-label="Document history"] tbody tr td:first-child strong').allTextContents();
  expect(firstPageTitles).toEqual([...firstPageTitles].sort((a, b) => a.localeCompare(b)));
  await page.getByRole("link", { name: "Next" }).click();
  await expect(page).toHaveURL(/sort=title_asc/);
  await expect(page).toHaveURL(/page=2/);
  await page.getByLabel("Search").last().fill("no-document-can-match-this-certification-query");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.getByText("No documents match the current filters.")).toBeVisible();
  await expect(page.locator(".pagination-bar")).toHaveCount(0);
});

test("disabled document actions expose the not-allowed cursor", async ({ page }) => {
  await openDocuments(page);
  const disabled = page.getByRole("button", { disabled: true }).first();
  await expect(disabled).toBeVisible();
  await expect(disabled).toHaveCSS("cursor", "not-allowed");
});
