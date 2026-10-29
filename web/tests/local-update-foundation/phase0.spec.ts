import { expect, test } from "@playwright/test";

import {
  documentNavigationCount,
  expectLocalUpdateShell,
  expectNoDocumentNavigation,
  expectScopedBusy,
  markLocalUpdateShell,
} from "../helpers/local-update-contract";

test.describe.configure({ timeout: 60_000 });

async function openDocuments(page: Parameters<typeof markLocalUpdateShell>[0]) {
  const response = await page.goto("/ess/documents", { waitUntil: "domcontentloaded" });
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1, name: "Documents" })).toBeVisible();
  await expect(page.locator(".ess-document-center")).toHaveAttribute("data-hydrated", "true");
}

test("scoped filter commits only confirmed URL state and restores Back locally", async ({ page }) => {
  await openDocuments(page);
  const shell = await markLocalUpdateShell(page);
  const navigationCount = await documentNavigationCount(page);
  const history = page.locator('section[aria-busy]').filter({ hasText: "Document history" });

  await page.getByLabel("Search", { exact: true }).fill("no-local-match");
  const response = page.waitForResponse((item) => item.url().includes("/api/me/document-center") && item.url().includes("no-local-match"));
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expectScopedBusy(page, history, page.getByRole("heading", { level: 1, name: "Documents" }));
  await response;
  await expect(page.getByText("No documents match the current filters.", { exact: true })).toBeVisible();
  await expect(page).toHaveURL(/q=no-local-match/);
  await expectLocalUpdateShell(shell);

  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(page).toHaveURL(/\/ess\/documents$/);
  await page.goBack({ waitUntil: "commit" });
  await expect(page.getByLabel("Search", { exact: true })).toHaveValue("no-local-match");
  await expect(page.getByText("No documents match the current filters.", { exact: true })).toBeVisible();
  await expectLocalUpdateShell(shell);
  await expectNoDocumentNavigation(page, navigationCount);
});

test("failed scoped filter retains records and URL", async ({ page }) => {
  await openDocuments(page);
  const shell = await markLocalUpdateShell(page);
  const navigationCount = await documentNavigationCount(page);
  const table = page.getByRole("table", { name: "Document history" });
  const originalRows = await table.locator("tbody tr").count();
  const originalUrl = page.url();

  await page.route("**/api/me/document-center**", (route) => route.fulfill({
    status: 503,
    contentType: "application/json",
    body: JSON.stringify({ detail: "Temporary scoped-read failure." }),
  }));
  await page.getByLabel("Search", { exact: true }).fill("failure-draft");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Document history was not updated." })).toContainText("Temporary scoped-read failure.");
  expect(await table.locator("tbody tr").count()).toBe(originalRows);
  expect(page.url()).toBe(originalUrl);
  await expect(page.getByLabel("Search", { exact: true })).toHaveValue("failure-draft");
  await expectLocalUpdateShell(shell);
  await expectNoDocumentNavigation(page, navigationCount);
});

test("popstate aborts an obsolete filter and prevents its late response", async ({ page }) => {
  await openDocuments(page);
  const shell = await markLocalUpdateShell(page);
  const navigationCount = await documentNavigationCount(page);

  await page.getByLabel("Search", { exact: true }).fill("first-committed");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page).toHaveURL(/q=first-committed/);

  await page.route("**/api/me/document-center?q=slow-obsolete**", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 600));
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [] }) }).catch(() => undefined);
  });
  await page.getByLabel("Search", { exact: true }).fill("slow-obsolete");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.locator('section[aria-busy]').filter({ hasText: "Document history" })).toHaveAttribute("aria-busy", "true");
  await page.goBack({ waitUntil: "commit" });
  await expect(page).toHaveURL(/\/ess\/documents$/);
  await expect(page.getByLabel("Search", { exact: true })).toHaveValue("");
  await expect(page.getByRole("table", { name: "Document history" }).locator("tbody tr")).not.toHaveCount(0);
  await page.waitForTimeout(700);
  await expect(page.getByLabel("Search", { exact: true })).toHaveValue("");
  await expectLocalUpdateShell(shell);
  await expectNoDocumentNavigation(page, navigationCount);
});

test("scoped pagination keeps an href fallback and preserves the shell", async ({ page }) => {
  await openDocuments(page);
  const shell = await markLocalUpdateShell(page);
  const navigationCount = await documentNavigationCount(page);
  const base = await page.request.get("/api/me/document-center?page_size=5");
  const payload = await base.json();

  await page.route("**/api/me/document-center**", async (route) => {
    const url = new URL(route.request().url());
    const requestedPage = Number(url.searchParams.get("page") || "1");
    const item = payload.items[0];
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ...payload,
        items: requestedPage === 1 ? payload.items : [{ ...item, id: `${item.id}-page-2`, title: "Second page document" }],
        page: requestedPage,
        page_size: 5,
        total_count: 6,
        has_previous: requestedPage > 1,
        has_next: requestedPage === 1,
      }),
    });
  });
  await page.locator('select[name="page_size"]').selectOption("5");
  await page.getByRole("button", { name: "Apply filters" }).click();
  const next = page.getByRole("link", { name: "Next", exact: true });
  await expect(next).toHaveAttribute("href", /\/ess\/documents\?.*page_size=5.*page=2/);
  await next.click();
  await expect(page).toHaveURL(/page=2/);
  await expect(page.getByRole("table", { name: "Document history" })).toContainText("Second page document");
  await expectLocalUpdateShell(shell);
  await expectNoDocumentNavigation(page, navigationCount);
});

test("confirmed upload reconciles through the scoped resource", async ({ page }) => {
  await openDocuments(page);
  const shell = await markLocalUpdateShell(page);
  const navigationCount = await documentNavigationCount(page);
  const base = await page.request.get("/api/me/document-center");
  const payload = await base.json();
  const stored = {
    ...payload.items[0],
    id: "phase0-upload",
    title: "Phase 0 upload",
    file_name: "phase0.txt",
    version_number: 1,
    verification_status: "pending",
  };
  let writes = 0;
  let reads = 0;
  await page.route("**/api/me/employee-documents", (route) => {
    writes += 1;
    return route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify(stored) });
  });
  await page.route("**/api/me/document-center**", (route) => {
    reads += 1;
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ...payload, items: [stored, ...payload.items], total_count: payload.total_count + 1 }),
    });
  });
  await page.getByRole("button", { name: "Upload document", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Title", { exact: true }).fill("Phase 0 upload");
  await dialog.getByLabel("File", { exact: true }).setInputFiles({ name: "phase0.txt", mimeType: "text/plain", buffer: Buffer.from("phase 0") });
  await dialog.getByRole("button", { name: "Submit for review", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("table", { name: "Document history" })).toContainText("Phase 0 upload");
  await expect(page.locator('.notice[role="status"]').filter({ hasText: "phase0.txt" })).toBeVisible();
  expect(writes).toBe(1);
  expect(reads).toBe(1);
  await expectLocalUpdateShell(shell);
  await expectNoDocumentNavigation(page, navigationCount);
});
