import { execFileSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { cleanupIsolatedQaWorkspace, provisionIsolatedQaWorkspace, workspacePersona, type IsolatedQaWorkspace } from "../helpers/isolated-qa-workspace";
import { gotoAuthenticated } from "../helpers/staging-auth";
import { expectNoHorizontalOverflow } from "../helpers/assertions";

// Loopback-only fault proxy: actual Django responses, with explicit read failures/delays.
// Run the production Next server with HRMS_API_BASE_URL=http://127.0.0.1:8069/api/v1.
let proxy: Server;
let workspace: IsolatedQaWorkspace;
let closed: { close_id: string; hash: string };
function django(code: string) {
  return execFileSync(path.resolve(__dirname, "../../../.venv/bin/python"), ["backend/manage.py", "shell", "-c", code], { cwd: path.resolve(__dirname, "../../.."), env: process.env, encoding: "utf8" });
}
let uploadPosts = 0;
let fault: { path: string; status?: number; delay?: number } | undefined;
const backend = "http://127.0.0.1:8048";
const evidence = process.env.HRMS_CERT_EVIDENCE_DIR || path.resolve(__dirname, "../../../docs/qa/evidence/ess4-documents-payroll");
async function capture(page: Page, filename: string) {
  await page.evaluate(() => {
    if (!document.querySelector('[role="dialog"]') && document.activeElement instanceof HTMLElement) document.activeElement.blur();
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  });
  await page.screenshot({ path: path.join(evidence, filename), fullPage: true });
}


test.describe("ESS-4 production documents and payroll", () => {
  test.describe.configure({ mode: "default" });
  test.setTimeout(90_000);
  test.beforeAll(async ({}, testInfo) => {
    test.setTimeout(120_000);
    if (process.env.POSTGRES_DB !== "hrms_ess2" || process.env.POSTGRES_HOST !== "127.0.0.1") throw new Error("ESS-4 certification requires the dedicated loopback hrms_ess2 database.");
    workspace = await provisionIsolatedQaWorkspace(testInfo);
    closed = JSON.parse(django(`import json; from tests.ess4_browser_fixture import prepare; print(json.dumps(prepare(${JSON.stringify(workspace.manifestPath)})))`).trim().split("\n").at(-1)!);
    proxy = createServer(async (request, response) => {
      try {
        const url = request.url || "/";
        if (request.method === "POST" && url.split("?")[0] === "/api/v1/me/employee-documents/") uploadPosts += 1;
        const active = fault?.path === url.split("?")[0] ? fault : undefined;
        if (active?.delay) await new Promise((resolve) => setTimeout(resolve, active.delay));
        if (active?.status) {
          response.writeHead(active.status, { "Content-Type": "application/json" });
          response.end(JSON.stringify({ detail: "Synthetic ESS-4 read failure" }));
          return;
        }
        const chunks: Buffer[] = [];
        for await (const chunk of request) chunks.push(Buffer.from(chunk));
        const body = Buffer.concat(chunks);
        const headers: Record<string, string> = {};
        for (const [key, value] of Object.entries(request.headers)) {
          if (typeof value === "string" && !["host", "connection", "content-length"].includes(key)) headers[key] = value;
        }
        const result = await fetch(`${backend}${url}`, { method: request.method, headers, ...(body.length ? { body } : {}) });
        const forwarded: Record<string, string> = { "Content-Type": result.headers.get("content-type") || "application/json" };
        for (const key of ["content-disposition", "x-payroll-artifact-checksum", "x-payroll-storage-provider", "x-payroll-storage-version", "x-payroll-download-strategy"]) {
          const value = result.headers.get(key);
          if (value) forwarded[key] = value;
        }
        response.writeHead(result.status, forwarded);
        response.end(Buffer.from(await result.arrayBuffer()));
      } catch {
        response.writeHead(502); response.end("Synthetic proxy could not reach local backend");
      }
    });
    await new Promise<void>((resolve, reject) => { proxy.once("error", reject); proxy.listen(8069, "127.0.0.1", resolve); });
  });
  const hydrationErrors: string[] = [];
  const cancelledBackgroundReads = new Map<string, string>();
  test.beforeEach(async ({ page }) => {
    hydrationErrors.length = 0;
    cancelledBackgroundReads.clear();
    page.on("requestfailed", request => {
      const url = new URL(request.url());
      const reason = request.failure()?.errorText || "";
      if (url.pathname.startsWith("/ess/") && url.searchParams.has("_rsc") && /cancelled|ERR_ABORTED/i.test(reason)) cancelledBackgroundReads.set(request.url(), reason);
    });
    page.on("pageerror", (error) => { if (/\/ess\/(documents|payslips)/.test(page.url())) hydrationErrors.push(error.message); });
  });
  test.afterEach(async ({}, testInfo) => {
    fault = undefined;
    const cancelled = [...cancelledBackgroundReads].map(([url, reason]) => ({ url, reason }));
    const expectedTransportAbort = (message: string) => message.includes("due to access control checks") && cancelled.some(({ url }) => message.includes(new URL(url).pathname + new URL(url).search));
    const ignored = hydrationErrors.filter(expectedTransportAbort);
    if (ignored.length) await writeFile(path.join(evidence, `${testInfo.project.name}-${testInfo.title.replace(/[^a-z0-9]+/gi, "-").slice(0, 70)}-cancelled-prefetch.json`), JSON.stringify({ messages: ignored, cancelled_requests: cancelled, scope: "Only exact-URL requestfailed-confirmed cancelled employee RSC reads on document navigation; HTTP denials, API failures and application/hydration errors are not excluded" }, null, 2));
    expect(hydrationErrors.filter(message => !expectedTransportAbort(message)), "Employee workspaces must hydrate consistently and raise no uncaught application errors").toEqual([]);
  });
  test.afterAll(async ({}, testInfo) => {
    let preserved = false;
    try {
      if (closed) django(`from tests.ess2_browser_fixture import verify; verify("${closed.close_id}", "${closed.hash}")`);
      if (workspace) django(`from tests.ess4_browser_fixture import verify_outputs; assert verify_outputs("${workspace.manifest.tenant.id}")`);
      preserved = Boolean(closed);
    } finally {
      if (workspace) django(`from apps.tenants.models import Tenant; from apps.documents.models import DocumentArtifact; tenant = Tenant.objects.get(pk="${workspace.manifest.tenant.id}", code__startswith="pw-qa-"); artifacts = DocumentArtifact.objects.filter(tenant=tenant); files = [(item.stored_file.storage, item.stored_file.name) for item in artifacts if item.stored_file]; [storage.delete(key) for storage, key in files]; assert all(not storage.exists(key) for storage, key in files)`);
      await cleanupIsolatedQaWorkspace(workspace);
      await writeFile(path.join(evidence, `${testInfo.project.name}-${workspace.seedRef}-fixture-cleanup.json`), JSON.stringify({ seed_ref: workspace?.seedRef, verified_absent: true, uploaded_files_verified_absent: true, finalized_snapshot_preserved: preserved, published_payroll_snapshots_preserved: preserved, close_id: closed?.close_id, snapshot_hash: closed?.hash }, null, 2));
      if (proxy) await new Promise<void>((resolve) => proxy.close(() => resolve()));
    }
  });

  async function open(page: Page, route = "/ess/payslips") {
    await gotoAuthenticated(page, route, workspacePersona(workspace, "employee"));
    await expect(page.getByRole("heading", { name: route.includes("documents") ? "Documents" : "Payslips", exact: true })).toBeVisible();
  }
  async function auth(page: Page) {
    const token = (await page.context().cookies()).find(cookie => cookie.name === "hrms_access_token")?.value;
    expect(token).toBeTruthy();
    return { Authorization: `Token ${token}` };
  }
  // Independent setup uses the real self upload contract when a restarted worker has no current file.
  async function ensureEmployeeEvidence(page: Page) {
    const headers = await auth(page);
    const response = await page.request.get(`${backend}/api/v1/me/document-center/`, { headers });
    expect(response.status()).toBe(200);
    const center = await response.json();
    const requirement = center.requirement_items.find((item: { category_name: string }) => item.category_name === "QA Employee Evidence");
    expect(requirement).toBeTruthy();
    if (requirement.current_document_id) return { id: requirement.current_document_id };
    const created = await page.request.post(`${backend}/api/v1/me/employee-documents/`, { headers, multipart: {
      category_id: requirement.category_id, title: "QA Fresh Employee Evidence", expires_on: "2035-12-31",
      file: { name: "ess4-evidence.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 Synthetic ESS4 evidence\n") },
    } });
    expect(created.status(), await created.text()).toBe(201);
    return await created.json() as { id: string };
  }
  test("published-only history, precise totals, filters and pagination", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await open(page);
    const table = page.getByRole("table", { name: "Published payslips" });
    await expect(table.locator("tbody tr")).toHaveCount(5);
    await expect(table).toContainText("28200.50");
    await expect(table).not.toContainText("QA Unpublished Secret");
    await expect(page.getByText("Pay dates are payroll dates, not confirmation of a bank payment.")).toBeVisible();
    await page.getByRole("link", { name: "Next", exact: true }).click();
    await expect(page.getByText("Page 2", { exact: true })).toBeVisible();
    await expect(table.locator("tbody tr")).toHaveCount(2);
    await page.goto("/ess/payslips?page=9999");
    await expect(page.getByText("Page 2", { exact: true })).toBeVisible();
    await page.goto("/ess/payslips?year=0000");
    await expect(table.locator("tbody tr")).toHaveCount(5);
    await page.getByRole("textbox", { name: "Search payslips", exact: true }).fill("QA Published Payslip 0");
    await page.getByRole("button", { name: "Apply", exact: true }).click();
    await expect(table.locator("tbody tr")).toHaveCount(1);
    await page.getByRole("combobox", { name: "Year", exact: true }).selectOption({ index: 1 });
    await page.getByRole("button", { name: "Apply", exact: true }).click();
    await expect(table.locator("tbody tr")).toHaveCount(1);
    await capture(page, `${test.info().project.name}-payslips-desktop.png`);
  });
  test("selected artifact full details, keyboard, download and durable acknowledgement", async ({ page }) => {
    await open(page);
    await page.getByRole("link", { name: "Select payslip", exact: true }).first().click();
    const opener = page.getByRole("button", { name: "Review payslip", exact: true });
    await opener.focus();
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("Synthetic line 7");
    await expect(dialog).toContainText("28200.50");
    await expect(dialog).not.toContainText("Paid ");
    const download = page.waitForEvent("download");
    await dialog.getByRole("link", { name: "Download payslip", exact: true }).click();
    expect((await download).suggestedFilename()).toMatch(/\.html$/);
    const terminal = page.waitForResponse(r => /\/read\/?$/.test(new URL(r.url()).pathname) && ![301,302,307,308].includes(r.status()));
    await dialog.getByRole("button", { name: "Mark as read", exact: true }).click();
    expect((await terminal).status()).toBe(200);
    await expect(dialog.getByRole("button", { name: "Read acknowledged" })).toBeDisabled();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(opener).toBeFocused();
    await expect(page.getByRole("table", { name: "Published payslips" }).getByText("Read", { exact: true })).toHaveCount(1);
    await page.reload();
    await opener.click();
    await expect(dialog.getByRole("button", { name: "Read acknowledged" })).toBeDisabled();
    const access = dialog.locator("summary").filter({ hasText: "Access and file information" });
    await access.focus(); await page.keyboard.press("Enter");
    await expect(dialog.getByText("Downloads", { exact: true })).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(dialog.getByText("Downloads", { exact: true })).toBeHidden();
    await capture(page, `${test.info().project.name}-payslip-detail.png`);
  });
  test("document requirements, honest permissions, detail and global history filters", async ({ page }) => {
    await open(page, "/ess/documents");
    const requirements = page.getByRole("table", { name: "Required documents" });
    const restricted = requirements.locator("tbody tr").filter({ hasText: "QA HR Controlled" });
    await expect(restricted.getByRole("button", { name: "Upload", exact: true })).toHaveCount(0);
    await restricted.getByRole("button", { name: "View", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "QA HR Controlled", exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
    await page.getByRole("textbox", { name: "Search", exact: true }).fill("QA Archived Evidence 0");
    await page.getByRole("button", { name: "Apply filters", exact: true }).click();
    const history = page.getByRole("table", { name: "Document history" });
    await expect(history.locator("tbody tr")).toHaveCount(1);
    await page.getByRole("button", { name: "Clear filters", exact: true }).click();
    await expect(history.locator("tbody tr")).toHaveCount(10);
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await expect(page.getByText("Page 2", { exact: true })).toBeVisible();
    await page.goto("/ess/documents?page=9999");
    await expect(page.getByText("Page 2", { exact: true })).toBeVisible();
    await page.goto("/ess/documents?category_id=------------------------------------&page=Infinity");
    await expect(history.locator("tbody tr")).toHaveCount(10);
    await capture(page, `${test.info().project.name}-documents-desktop.png`);
  });
  test("document upload validation, persisted review status and protected download", async ({ page }) => {
    await open(page, "/ess/documents");
    await page.getByRole("button", { name: "Upload document", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Upload document", exact: true });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("combobox", { name: "Category", exact: true }).selectOption({ label: "QA Employee Evidence" });
    await dialog.getByRole("textbox", { name: "Title", exact: true }).fill("QA Fresh Employee Evidence");
    await dialog.getByLabel("File", { exact: false }).setInputFiles({ name: "blocked.js", mimeType: "text/javascript", buffer: Buffer.from("alert(1)") });
    await dialog.getByRole("button", { name: "Submit for review", exact: true }).click();
    await expect(dialog.getByText(/Executable or script files/)).toBeVisible();
    await dialog.getByLabel("File", { exact: false }).setInputFiles({ name: "ess4-evidence.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 Synthetic ESS4 evidence\n") });
    await dialog.getByLabel("Expires on", { exact: true }).fill("2035-12-31");
    fault = { path: "/api/v1/me/employee-documents/", status: 503 };
    await dialog.getByRole("button", { name: "Submit for review", exact: true }).click();
    await expect(dialog.getByRole("alert")).toContainText("Upload outcome could not be confirmed. Check document history before retrying; your draft is retained.");
    await expect(dialog.getByRole("textbox", { name: "Title", exact: true })).toHaveValue("QA Fresh Employee Evidence");
    fault = undefined;
    uploadPosts = 0;
    const terminal = page.waitForResponse(r => /\/employee-documents\/?$/.test(new URL(r.url()).pathname) && r.request().method() === "POST" && ![301,302,307,308].includes(r.status()));
    await dialog.getByRole("button", { name: "Submit for review", exact: true }).click({ clickCount: 2 });
    expect((await terminal).status()).toBe(201);
    expect(uploadPosts).toBe(1);
    await expect(dialog).toBeHidden();
    const row = page.getByRole("table", { name: "Document history" }).locator("tbody tr").filter({ hasText: "QA Fresh Employee Evidence" });
    await expect(row).toContainText(/Pending/i);
    await row.getByRole("button", { name: "Review", exact: true }).click();
    await expect(page.getByRole("dialog")).toContainText("ess4-evidence.pdf");
    const download = page.waitForEvent("download");
    await page.getByRole("dialog").getByRole("link", { name: "Download file", exact: true }).click();
    expect((await download).suggestedFilename()).toBe("ess4-evidence.pdf");
    await page.keyboard.press("Escape");
    await page.reload();
    await expect(row).toBeVisible();
  });
  test("HR-returned document replacement preserves the version trail", async ({ page }) => {
    await open(page, "/ess/documents");
    const first = await ensureEmployeeEvidence(page);
    expect(first).toBeTruthy();
    await gotoAuthenticated(page, "/ess/documents", workspacePersona(workspace, "hr_admin"));
    const hrHeaders = await auth(page);
    const decision = await page.request.patch(`${backend}/api/v1/hr-admin/employee-documents/${first.id}/`, { headers: hrHeaders, data: { verification_status: "rejected", reupload_requested: true, rejection_reason: "Please provide a clearer scan." } });
    expect(decision.status()).toBe(200);
    await open(page, "/ess/documents");
    const requirement = page.getByRole("table", { name: "Required documents" }).locator("tbody tr").filter({ hasText: "QA Employee Evidence" });
    await expect(requirement).toContainText("Returned by HR");
    await requirement.getByRole("button", { name: "Replace", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Replace document", exact: true });
    await dialog.getByRole("textbox", { name: "Title", exact: true }).fill("QA Replacement Evidence");
    await dialog.getByLabel("Expires on", { exact: true }).fill("2035-12-31");
    await dialog.getByLabel("File", { exact: false }).setInputFiles({ name: "replacement.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 Synthetic replacement\n") });
    await dialog.getByRole("button", { name: "Submit for review", exact: true }).click();
    await expect(dialog).toBeHidden();
    const history = page.getByRole("table", { name: "Document history" });
    const replacement = history.locator("tbody tr").filter({ hasText: "QA Replacement Evidence" });
    await expect(replacement).toContainText("v2");
    await expect(history.locator("tbody tr").filter({ hasText: "QA Fresh Employee Evidence" })).toContainText("replaced");
    await replacement.getByRole("button", { name: "Review", exact: true }).click();
    await expect(page.getByRole("dialog")).toContainText("v2");
    await capture(page, `${test.info().project.name}-replacement-detail.png`);
  });
  test("direct authorization rejects other employee artifacts and anonymous requests", async ({ page, playwright }) => {
    await open(page);
    const headers = await auth(page);
    const own = await page.request.get(`${backend}/api/v1/me/payroll-payslips/`, { headers });
    const id = (await own.json()).items[0].id;
    await gotoAuthenticated(page, "/ess/payslips", workspacePersona(workspace, "manager"));
    const manager = await auth(page);
    for (const action of ["download", "read", "signed-access"]) {
      const url = `${backend}/api/v1/me/payroll-payslips/${id}/${action}/`;
      const denied = action === "download" ? await page.request.get(url, { headers: manager }) : await page.request.post(url, { headers: manager, data: {} });
      expect(denied.status()).toBe(404);
    }
    const anonymous = await playwright.request.newContext();
    expect([401, 403]).toContain((await anonymous.get(`${backend}/api/v1/me/document-center/`)).status());
    expect([401, 403]).toContain((await anonymous.get(`${backend}/api/v1/me/payroll-payslips/`)).status());
    await anonymous.dispose();
    await page.context().clearCookies();
    await page.goto("/ess/documents");
    await expect(page).toHaveURL(/\/login/);
    await page.goto("/ess/payslips");
    await expect(page).toHaveURL(/\/login/);
  });
  test("failed artifact download retries safely without changing payroll", async ({ page }) => {
    await open(page);
    const listing = await page.request.get(`${backend}/api/v1/me/payroll-payslips/`, { headers: await auth(page) });
    const item = (await listing.json()).items[0];
    fault = { path: `/api/v1/me/payroll-payslips/${item.id}/download/`, status: 503 };
    const row = page.getByRole("table", { name: "Published payslips" }).locator("tbody tr").first();
    await row.getByRole("link", { name: "Download payslip", exact: true }).click();
    await expect(row.getByRole("alert")).toContainText("Synthetic ESS-4 read failure");
    fault = undefined;
    const download = page.waitForEvent("download");
    await row.getByRole("link", { name: "Retry download", exact: true }).click();
    expect((await download).suggestedFilename()).toBe(item.file_name);
    await expect(row).toContainText("28200.50");
  });
  test("responsive desktop/tablet/mobile bounds, names, keyboard focus and reduced motion", async ({ page }) => {
    await open(page, "/ess/documents");
    await ensureEmployeeEvidence(page);
    await page.reload();
    await expect(page.getByRole("heading", { name: "Documents", exact: true })).toBeVisible();
    const panel = page.locator(".workspace-standard-panel").filter({ has: page.getByRole("heading", { name: "Document status", exact: true }) });
    const mainBox = await page.locator("main.ess-compact").boundingBox();
    const panelBox = await panel.boundingBox();
    expect(panelBox!.width).toBeGreaterThan(mainBox!.width * 0.85);
    await page.emulateMedia({ reducedMotion: "reduce" });
    for (const width of [320, 390, 768]) {
      await page.setViewportSize({ width, height: 900 });
      for (const route of ["payslips", "documents"]) {
        await page.goto(`/ess/${route}`);
        await expectNoHorizontalOverflow(page);
        await capture(page, `${test.info().project.name}-${route}-${width}.png`);
      }
    }
    await page.setViewportSize({ width: 390, height: 844 });
    const opener = page.getByRole("button", { name: "Upload document", exact: true });
    await opener.focus(); await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog", { name: "Replace document", exact: true });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("combobox", { name: "Category", exact: true })).toBeFocused();
    await expectNoHorizontalOverflow(page);
    await capture(page, `${test.info().project.name}-upload-mobile.png`);
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden(); await expect(opener).toBeFocused();
    expect(await opener.evaluate(el => getComputedStyle(el).outlineStyle)).toBe("solid");
    expect(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(true);
    await page.goto("/ess/payslips");
    await page.getByRole("button", { name: "Review payslip", exact: true }).click();
    await expect(page.getByRole("dialog")).toContainText("Synthetic line 7");
    await expectNoHorizontalOverflow(page);
    const payslipDialog = page.getByRole("dialog");
    for (const size of [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 768, height: 900 }]) {
      await page.setViewportSize(size);
      // Firefox can expose old dialog bounds and new child bounds across resize frames.
      // Wait for layout frames, retaining every original containment assertion.
      await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
      const bounds = await payslipDialog.boundingBox();
      expect(bounds!.x).toBeGreaterThanOrEqual(0);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(size.width);
      expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(size.height);
      const headerClose = payslipDialog.getByRole("button", { name: /^Close .+/ });
      for (const control of [headerClose, payslipDialog.getByRole("link", { name: "Download payslip", exact: true }), payslipDialog.getByRole("button", { name: "Close", exact: true })]) {
        await expect(control).toBeVisible();
        const box = await control.boundingBox();
        expect(box!.x).toBeGreaterThanOrEqual(bounds!.x);
        expect(box!.x + box!.width).toBeLessThanOrEqual(bounds!.x + bounds!.width);
        expect(box!.y).toBeGreaterThanOrEqual(bounds!.y);
        expect(box!.y + box!.height).toBeLessThanOrEqual(size.height);
      }
      const body = payslipDialog.locator(".hr-admin-action-modal__body");
      await body.evaluate(el => { el.scrollTop = el.scrollHeight; });
      await expect(payslipDialog.getByText("Source hash", { exact: true })).toBeInViewport();
      await payslipDialog.getByRole("button", { name: "Close", exact: true }).focus();
      await page.keyboard.press("Tab");
      await expect(headerClose).toBeFocused();
      await page.keyboard.press("Shift+Tab");
      await expect(payslipDialog.getByRole("button", { name: "Close", exact: true })).toBeFocused();
      await body.evaluate(el => { el.scrollTop = 0; });
      await capture(page, `${test.info().project.name}-payslip-dialog-${size.width}.png`);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await capture(page, `${test.info().project.name}-payslip-mobile.png`);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();
  });
  test("empty, loading, read failure and authenticated retry", async ({ page }) => {
    await open(page, "/ess/payslips?q=no-matching-artifact");
    await expect(page.getByText("No payslips found.")).toBeVisible();
    await page.goto("/ess/documents?q=no-matching-document");
    await expect(page.getByText("No documents match the current filters.")).toBeVisible();
    fault = { path: "/api/v1/me/document-center/", delay: 1500 };
    const streamedDocument = page.goto("/ess/documents?probe=streamed");
    await expect(page.getByRole("status", { name: "Loading employee workspace", exact: true })).toBeVisible();
    await streamedDocument;
    await expect(page.getByRole("heading", { name: "Documents", exact: true })).toBeVisible();
    fault = undefined;
    fault = { path: "/api/v1/me/document-center/", status: 503 };
    await page.goto("/ess/documents");
    await expect(page.getByRole("button", { name: "Retry workspace", exact: true })).toBeVisible();
    fault = undefined;
    await page.getByRole("button", { name: "Retry workspace", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Documents", exact: true })).toBeVisible();
    fault = { path: "/api/v1/me/payroll-payslips/", delay: 2000 };
    const navigation = page.goto("/ess/payslips?probe=loading");
    await expect(page.getByRole("status", { name: "Loading employee workspace", exact: true })).toBeVisible();
    await navigation;
    await expect(page.getByRole("heading", { name: "Payslips", exact: true })).toBeVisible();
    await expect(page.getByRole("status", { name: "Loading employee workspace", exact: true })).toHaveCount(0);
  });

  test("ESS shell navigates without speculative unrelated private reads", async ({ page }) => {
    const unsolicited: string[] = [];
    page.on("request", request => {
      const url = new URL(request.url());
      if (url.searchParams.has("_rsc") && ["/ess/statutory-declarations", "/ess/notifications", "/ess/attendance", "/ess/leave"].includes(url.pathname)) unsolicited.push(url.pathname);
    });
    await open(page, "/ess/documents");
    await expect(page.locator("#ess-content")).toHaveCount(1);
    await page.getByRole("link", { name: "Published payslips", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Payslips", exact: true })).toBeVisible();
    await page.getByRole("link", { name: "Employee documents", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Documents", exact: true })).toBeVisible();
    expect(unsolicited, "Opening documents must not prefetch other private modules").toEqual([]);
  });

  test("cached shell survives repeated delayed document streams with server-rendered content", async ({ page }) => {
    await open(page, "/ess/documents");
    fault = { path: "/api/v1/me/document-center/", delay: 1000 };
    for (let index = 0; index < 5; index++) {
      const response = await page.goto(`/ess/documents?stream_probe=${index}`);
      expect(response?.status()).toBe(200);
      expect(await response!.text(), "Employee content remains server rendered").toContain("<h1>Documents</h1>");
      await expect(page.getByRole("table", { name: "Required documents", exact: true })).toBeVisible();
      await expect(page.locator("#ess-content")).toHaveCount(1);
    }
    fault = undefined;
    await capture(page, `${test.info().project.name}-streamed-documents.png`);
  });

});
