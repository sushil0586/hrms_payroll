import { execFileSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { cleanupIsolatedQaWorkspace, provisionIsolatedQaWorkspace, workspacePersona, type IsolatedQaWorkspace } from "../helpers/isolated-qa-workspace";
import { gotoAuthenticated } from "../helpers/staging-auth";
import { expectNoHorizontalOverflow } from "../helpers/assertions";

// Loopback-only fault proxy: actual Django responses, with explicit read failures/delays.
// Run the production Next server with HRMS_API_BASE_URL=http://127.0.0.1:8059/api/v1.
let proxy: Server;
let workspace: IsolatedQaWorkspace;
let closed: { close_id: string; hash: string };
function django(code: string) {
  return execFileSync(path.resolve(__dirname, "../../../.venv/bin/python"), ["backend/manage.py", "shell", "-c", code], { cwd: path.resolve(__dirname, "../../.."), env: process.env, encoding: "utf8" });
}
let fault: { path: string; status?: number; delay?: number } | undefined;
let leaveSubmissionResponse: { status: number; body: string } | null = null;
const backend = process.env.PLAYWRIGHT_BACKEND_URL?.replace(/\/api\/v1\/?$/, "") ?? "http://127.0.0.1:8048";
const evidence = process.env.HRMS_CERT_EVIDENCE_DIR || path.resolve(__dirname, "../../../docs/qa/evidence/ess3-leave");
async function capture(page: Page, filename: string) {
  await page.evaluate(() => {
    if (!document.querySelector('[role="dialog"]') && document.activeElement instanceof HTMLElement) document.activeElement.blur();
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  });
  await page.screenshot({ path: path.join(evidence, filename), fullPage: true });
}


async function applyMonth(page: Page) {
  const terminal = page.waitForResponse(response => response.request().isNavigationRequest() && new URL(response.url()).pathname === "/ess/leave" && ![301, 302, 307, 308].includes(response.status()));
  await page.getByRole("button", { name: "Apply month", exact: true }).click();
  const document = await terminal;
  expect(document.status()).toBe(200);
  expect(await document.finished()).toBeNull();
}

test.describe("ESS-3 production leave", () => {
  test.describe.configure({ mode: "serial" });
  test.setTimeout(90_000);
  test.beforeAll(async ({}, testInfo) => {
    test.setTimeout(120_000);
    if (process.env.POSTGRES_DB !== "hrms_ess2" || process.env.POSTGRES_HOST !== "127.0.0.1") throw new Error("ESS-3 certification requires the dedicated loopback hrms_ess2 database.");
    workspace = await provisionIsolatedQaWorkspace(testInfo);
    closed = JSON.parse(django(`import json; from tests.ess3_browser_fixture import prepare; print(json.dumps(prepare(${JSON.stringify(workspace.manifestPath)})))`).trim().split("\n").at(-1)!);
    proxy = createServer(async (request, response) => {
      try {
        const url = request.url || "/";
        const active = fault?.path === url.split("?")[0] ? fault : undefined;
        if (active?.delay) await new Promise((resolve) => setTimeout(resolve, active.delay));
        if (active?.status) {
          response.writeHead(active.status, { "Content-Type": "application/json" });
          response.end(JSON.stringify({ detail: "Synthetic ESS-3 read failure" }));
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
        const responseBody = Buffer.from(await result.arrayBuffer());
        if (request.method === "POST" && url.split("?")[0] === "/api/v1/me/leave-requests/") {
          leaveSubmissionResponse = { status: result.status, body: responseBody.toString("utf8") };
        }
        response.writeHead(result.status, { "Content-Type": result.headers.get("content-type") || "application/json" });
        response.end(responseBody);
      } catch {
        response.writeHead(502); response.end("Synthetic proxy could not reach local backend");
      }
    });
    await new Promise<void>((resolve, reject) => { proxy.once("error", reject); proxy.listen(Number(process.env.ESS3_PROXY_PORT ?? 8059), "127.0.0.1", resolve); });
  });
  const hydrationErrors: string[] = [];
  test.beforeEach(async ({ page }) => {
    hydrationErrors.length = 0;
    leaveSubmissionResponse = null;
    page.on("pageerror", (error) => { if (page.url().includes("/ess/leave") && /hydration|Minified React error #418/i.test(error.message)) hydrationErrors.push(error.message); });
  });
  test.afterEach(() => {
    fault = undefined;
    expect(hydrationErrors, "SSR and browser content must hydrate consistently").toEqual([]);
  });
  test.afterAll(async ({}, testInfo) => {
    let preserved = false;
    try {
      if (closed) django(`from tests.ess2_browser_fixture import verify; verify("${closed.close_id}", "${closed.hash}")`);
      preserved = Boolean(closed);
    } finally {
      if (workspace) django(`from apps.tenants.models import Tenant; from apps.documents.models import DocumentArtifact; tenant = Tenant.objects.get(pk="${workspace.manifest.tenant.id}", code__startswith="pw-qa-"); artifacts = DocumentArtifact.objects.filter(tenant=tenant); files = [(item.stored_file.storage, item.stored_file.name) for item in artifacts if item.stored_file]; [storage.delete(key) for storage, key in files]; assert all(not storage.exists(key) for storage, key in files)`);
      await cleanupIsolatedQaWorkspace(workspace);
      await writeFile(path.join(evidence, `${testInfo.project.name}-fixture-cleanup.json`), JSON.stringify({ seed_ref: workspace?.seedRef, verified_absent: true, uploaded_files_verified_absent: true, finalized_snapshot_preserved: preserved, close_id: closed?.close_id, snapshot_hash: closed?.hash }, null, 2));
      if (proxy) await new Promise<void>((resolve) => proxy.close(() => resolve()));
    }
  });

  async function open(page: Page, suffix = "") {
    await gotoAuthenticated(page, `/ess/leave${suffix}`, workspacePersona(workspace, "employee"));
    await expect(page.getByRole("heading", { name: "Leave", exact: true })).toBeVisible();
  }
  async function headers(page: Page) {
    const token = (await page.context().cookies()).find(cookie => cookie.name === "hrms_access_token")?.value;
    expect(token).toBeTruthy();
    return { Authorization: `Token ${token}` };
  }
  test("entitlements, complete-history filters and pagination", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await open(page);
    await expect(page.getByRole("heading", { name: "Your entitlements" })).toBeVisible();
    await expect(page.locator("article").filter({ has: page.getByRole("heading", { name: "QA Governed Leave", exact: true }) })).toContainText("12.25 units available");
    await expect(page.getByText(/Search and filters cover your complete history/)).toBeVisible();
    await expect(page.getByRole("table", { name: "Leave request history" }).locator("tbody tr")).toHaveCount(10);
    await page.getByRole("link", { name: "Next", exact: true }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(page.getByText("Page 2", { exact: true })).toBeVisible();
    await page.getByLabel("Search leave history").fill("no-such-request");
    await page.getByRole("button", { name: "Apply filters", exact: true }).click();
    await expect(page.getByText("No leave requests match this view.")).toBeVisible();
    await page.getByRole("link", { name: "Clear filters", exact: true }).click();
    await expect(page.getByLabel("Search leave history")).toHaveValue("");
    await page.goto("/ess/leave?status=rejected&page=9999");
    await expect(page.getByText("Page 2", { exact: true })).toBeVisible();
    await capture(page, `${test.info().project.name}-leave-desktop.png`);
  });
  test("calendar month and date-only boundaries with request details", async ({ page }) => {
    await open(page, "?status=rejected");
    await page.getByRole("button", { name: "Show calendar" }).click();
    await page.getByLabel("Calendar month", { exact: true }).fill("2026-09");
    await applyMonth(page);
    const calendar = page.getByRole("region", { name: "Leave request calendar" });
    await expect(calendar.getByRole("link")).toHaveCount(30);
    const first = calendar.getByRole("link", { name: /2026-09-.*: 1 request$/ }).first();
    const label = await first.getAttribute("aria-label");
    await first.click();
    await expect(first).toHaveAttribute("aria-current", "date");
    const day = page.getByRole("region", { name: "Selected leave day" });
    await expect(day.getByRole("heading")).toContainText("Sep 2026");
    await expect(day).toContainText("matching request");
    await page.getByRole("table", { name: "Leave request history" }).getByRole("button", { name: /View/ }).first().click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("dialog")).toContainText("Synthetic history");
    expect(label).toContain("2026-09");
    await page.keyboard.press("Escape");
    await capture(page, `${test.info().project.name}-leave-calendar.png`);
    await page.getByLabel("Calendar month", { exact: true }).fill("2028-02");
    await applyMonth(page);
    await expect(calendar.getByRole("link")).toHaveCount(29);
    await calendar.getByRole("link", { name: "2028-02-29: 0 requests", exact: true }).click();
    await expect(day).toContainText("0 matching requests");
  });
  test("off-page detail links, governed restrictions and accessible dialog", async ({ page }) => {
    const id = workspace.manifest.fixtures.leave_request_id;
    await open(page, `?status=rejected&requestId=${id}`);
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("heading", { name: "Timeline", exact: true })).toBeVisible();
    await expect(dialog.locator(".detail-row").filter({ has: page.getByText("Reason", { exact: true }) })).toContainText("Playwright manager queue");
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    const opener = page.getByRole("button", { name: "Apply leave", exact: true });
    await opener.focus(); await page.keyboard.press("Enter");
    await expect(page.getByRole("combobox", { name: "Leave type", exact: true })).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(page.getByRole("dialog")).toContainText("Apply leave");
    await page.keyboard.press("Escape");
    await expect(opener).toBeFocused();
  });
  let submittedId = "";
  test("validation, half-day submission, evidence and duplicate protection", async ({ page }) => {
    await open(page, "#apply-leave");
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await page.getByLabel("Start date", { exact: true }).fill("2026-11-02");
    await page.getByLabel("End date", { exact: true }).fill("2026-11-02");
    await page.getByRole("button", { name: "Submit leave", exact: true }).click();
    await expect(page.getByText("Enter the reason for this leave request.")).toBeVisible();
    await page.getByLabel("Reason for leave").fill("ESS3 synthetic half-day evidence workflow");
    await page.getByLabel("Start day portion").selectOption("first_half");
    await page.getByLabel("End day portion").selectOption("first_half");
    await page.getByLabel("Evidence file", { exact: true }).setInputFiles({ name: "ess3-evidence.txt", mimeType: "text/plain", buffer: Buffer.from("Synthetic ESS3 evidence only") });
    let submissions = 0;
    page.on("request", request => { if (request.url().endsWith("/api/me/leave-requests") && request.method() === "POST") submissions += 1; });
    const response = page.waitForResponse(r => r.url().endsWith("/api/me/leave-requests") && r.request().method() === "POST");
    await page.getByRole("button", { name: "Submit leave", exact: true }).dblclick();
    const result = await response;
    // Native completion can retire Chromium's response-body resource before dblclick resolves.
    // These are the unmodified real Django bytes, captured before forwarding to this browser.
    const captured = leaveSubmissionResponse as { status: number; body: string } | null;
    expect(captured).not.toBeNull();
    if (!captured) throw new Error("The real leave submission response was not observed.");
    expect(result.status(), captured.body).toBe(201);
    expect(captured.status).toBe(result.status());
    const submitted = JSON.parse(captured.body);
    expect(submitted.id).toEqual(expect.any(String));
    submittedId = submitted.id;
    expect(submissions).toBe(1);
    await expect(dialog).toBeHidden();
    await expect(page.getByRole("status").filter({ hasText: "Leave request submitted" })).toBeVisible();
    const appliedRow = page.getByRole("table", { name: "Leave request history" }).getByRole("row").filter({ has: page.getByRole("button", { name: "View QA Casual Leave from 2026-11-02", exact: true }) });
    await expect(appliedRow).toContainText("pending");
    await appliedRow.getByRole("button").click();
    await expect(page.getByRole("dialog")).toContainText("0.50");
    const download = page.getByRole("dialog").getByRole("link", { name: /ess3-evidence.txt/ });
    await expect(download).toBeVisible();
    const artifact = await page.request.get((await download.getAttribute("href"))!);
    expect(artifact.status()).toBe(200);
    expect((await artifact.body()).toString()).toBe("Synthetic ESS3 evidence only");
  });
  test("withdrawal updates real request and history", async ({ page }) => {
    expect(submittedId).toBeTruthy();
    await open(page, `?requestId=${submittedId}`);
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Reason", { exact: true }).fill("Synthetic schedule change");
    const response = page.waitForResponse(r => r.url().includes(`${submittedId}/withdraw`) && r.request().method() === "POST" && ![301, 302, 307, 308].includes(r.status()));
    await dialog.getByRole("button", { name: "Withdraw request", exact: true }).click();
    expect((await response).status()).toBe(200);
    await expect(dialog).toBeHidden();
    const withdrawnRow = page.getByRole("table", { name: "Leave request history" }).getByRole("row").filter({ has: page.getByRole("button", { name: "View QA Casual Leave from 2026-11-02", exact: true }) });
    await expect(withdrawnRow).toContainText("withdrawn");
    await withdrawnRow.getByRole("button").click();
    await expect(page.getByRole("dialog")).toContainText("withdrawn");
    await expect(page.getByRole("dialog").getByRole("button", { name: "Withdraw request", exact: true })).toHaveCount(0);
  });
  test("policy restriction, authorized decision and permitted cancellation", async ({ page }) => {
    const originalId = workspace.manifest.fixtures.leave_request_id;
    const manager = workspacePersona(workspace, "manager");
    const login = await page.request.post(`${backend}/api/v1/auth/login/`, { data: { identifier: manager.username, password: manager.password } });
    expect(login.status()).toBe(200);
    const token = (await login.json()).token;
    const approval = await page.request.post(`${backend}/api/v1/manager/leave-requests/${originalId}/approve/`, { headers: { Authorization: `Token ${token}` }, data: { comment: "Synthetic ESS3 approval" } });
    expect(approval.status(), await approval.text()).toBe(200);
    await open(page, `?requestId=${originalId}`);
    const dialog = page.getByRole("dialog");
    await expect(dialog).toContainText("approved");
    await expect(dialog.getByText("Cancel unavailable.", { exact: true })).toBeVisible();
    await expect(dialog).toContainText("This leave policy does not allow employee cancellation after approval.");
    const auth = await headers(page);
    const types = await (await page.request.get(`${backend}/api/v1/me/leave-types/`, { headers: auth })).json();
    const type = types.find((item: { code: string }) => item.code === "ess3-direct");
    const created = await page.request.post(`${backend}/api/v1/me/leave-requests/`, { headers: auth, data: {
      leave_type_id: type.id, start_date: "2026-11-03", end_date: "2026-11-03", reason: "Synthetic permitted cancellation",
      start_day_portion: "full_day", end_day_portion: "full_day",
    } });
    expect(created.status(), await created.text()).toBe(201);
    const id = (await created.json()).id;
    expect((await page.request.post(`${backend}/api/v1/manager/leave-requests/${id}/approve/`, { headers: { Authorization: `Token ${token}` }, data: { comment: "Approved under configured test policy" } })).status()).toBe(200);
    await page.goto(`/ess/leave?requestId=${id}`);
    await dialog.getByLabel("Reason", { exact: true }).fill("Synthetic approved cancellation");
    const response = page.waitForResponse(r => r.url().includes(`${id}/cancel`) && r.request().method() === "POST" && ![301, 302, 307, 308].includes(r.status()));
    await dialog.getByRole("button", { name: "Cancel approved leave", exact: true }).click();
    expect((await response).status()).toBe(200);
    await expect(dialog).toBeHidden();
    const cancelledRow = page.getByRole("table", { name: "Leave request history" }).getByRole("row").filter({ has: page.getByRole("button", { name: "View QA Direct Leave from 2026-11-03", exact: true }) });
    await expect(cancelledRow).toContainText("cancelled");
    await cancelledRow.getByRole("button").click();
    await expect(page.getByRole("dialog")).toContainText("cancelled");
  });
  test("governed cancellation approval is identified and rejection preserves approved leave", async ({ page }) => {
    await open(page);
    const auth = await headers(page);
    const types = await (await page.request.get(`${backend}/api/v1/me/leave-types/`, { headers: auth })).json();
    const type = types.find((item: { code: string }) => item.code === "ess3-reapproval");
    expect(type).toBeTruthy();
    const created = await page.request.post(`${backend}/api/v1/me/leave-requests/`, { headers: auth, data: {
      leave_type_id: type.id, start_date: "2026-11-04", end_date: "2026-11-04", reason: "Synthetic governed cancellation",
      start_day_portion: "full_day", end_day_portion: "full_day",
    } });
    expect(created.status(), await created.text()).toBe(201);
    const id = (await created.json()).id;
    const manager = workspacePersona(workspace, "manager");
    const login = await page.request.post(`${backend}/api/v1/auth/login/`, { data: { identifier: manager.username, password: manager.password } });
    const managerHeaders = { Authorization: `Token ${(await login.json()).token}` };
    expect((await page.request.post(`${backend}/api/v1/manager/leave-requests/${id}/approve/`, { headers: managerHeaders, data: { comment: "Approved" } })).status()).toBe(200);
    await page.goto(`/ess/leave?requestId=${id}`);
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Reason", { exact: true }).fill("Please approve this cancellation");
    const response = page.waitForResponse(r => r.url().includes(`${id}/cancel`) && r.request().method() === "POST" && ![301, 302, 307, 308].includes(r.status()));
    await dialog.getByRole("button", { name: "Submit cancellation request", exact: true }).click();
    expect((await response).status()).toBe(200);
    await expect(dialog).toBeHidden();
    const cancellationRow = page.getByRole("table", { name: "Leave request history" }).getByRole("row").filter({ has: page.getByRole("button", { name: "View QA Governed Leave from 2026-11-04", exact: true }) });
    await expect(cancellationRow).toContainText("Cancellation awaiting approval");
    await cancellationRow.getByRole("button").click();
    await expect(dialog).toContainText("Cancellation awaiting approval");
    expect((await page.request.post(`${backend}/api/v1/manager/leave-requests/${id}/reject/`, { headers: managerHeaders, data: { comment: "Retain approved leave" } })).status()).toBe(200);
    await page.goto(`/ess/leave?requestId=${id}`);
    await expect(dialog).toContainText("approved");
    await expect(dialog).not.toContainText("Cancellation awaiting approval");
  });
  test("direct authorization, empty/error/loading and read-only retry", async ({ page }) => {
    await open(page, "?status=partially_approved");
    await expect(page.getByText("No leave requests match this view.")).toBeVisible();
    const auth = await headers(page);
    const randomId = "00000000-0000-0000-0000-000000000001";
    for (const path of [`/me/leave-requests/${randomId}/`, `/me/leave-requests/${randomId}/attachments/${randomId}/download/`]) {
      expect((await page.request.get(`${backend}/api/v1${path}`, { headers: auth })).status()).toBe(404);
    }
    expect((await page.request.post(`${backend}/api/v1/manager/leave-requests/${workspace.manifest.fixtures.leave_request_id}/approve/`, { headers: auth, data: {} })).status()).toBe(403);
    fault = { path: "/api/v1/me/leave-requests/", status: 503 };
    await page.goto("/ess/leave");
    await expect(page.getByRole("button", { name: /try again|retry/i })).toBeVisible();
    fault = undefined;
    await page.getByRole("button", { name: /try again|retry/i }).click();
    await expect(page.getByRole("heading", { name: "Leave", exact: true })).toBeVisible();
    fault = { path: "/api/v1/me/leave-requests/", delay: 4000 };
    const delayedDocument = await page.goto("/ess/leave?status=approved", { waitUntil: "commit" });
    await expect(page.getByRole("status", { name: "Loading employee workspace", exact: true })).toBeVisible();
    expect(delayedDocument?.status()).toBe(200);
    // The injected upstream delay is transport time, not the UI render budget.
    expect(await delayedDocument!.finished()).toBeNull();
    await expect(page.getByRole("heading", { name: "Leave", exact: true })).toBeVisible();
  });
  test("mobile/tablet density, accessible names, focus and reduced motion", async ({ page }) => {
    await open(page);
    await page.getByRole("button", { name: "Show calendar" }).click();
    await page.getByLabel("Calendar month", { exact: true }).fill("2026-09");
    await applyMonth(page);
    for (const width of [320, 390, 768]) {
      await page.setViewportSize({ width, height: 900 });
      await expectNoHorizontalOverflow(page);
      await capture(page, `${test.info().project.name}-leave-${width}.png`);
    }
    await page.setViewportSize({ width: 390, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    expect(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(true);
    await page.getByRole("button", { name: "Apply leave", exact: true }).focus();
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog");
    await expect(dialog).toHaveAccessibleName("Apply leave");
    await expect(page.getByRole("combobox", { name: "Leave type", exact: true })).toBeFocused();
    const focus = await page.getByRole("combobox", { name: "Leave type", exact: true }).evaluate(element => ({ width: getComputedStyle(element).outlineWidth, style: getComputedStyle(element).outlineStyle }));
    expect(parseFloat(focus.width)).toBeGreaterThan(0);
    expect(focus.style).not.toBe("none");
    const durations = await dialog.evaluate(element => getComputedStyle(element).transitionDuration.split(",").map(value => parseFloat(value)));
    expect(durations.every(duration => duration <= 0.01)).toBe(true);
    await expectNoHorizontalOverflow(page);
    await capture(page, `${test.info().project.name}-leave-form-mobile.png`);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: "Apply leave", exact: true })).toBeFocused();
  });
});
