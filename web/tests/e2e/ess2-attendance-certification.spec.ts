import { execFileSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { cleanupIsolatedQaWorkspace, provisionIsolatedQaWorkspace, workspacePersona, type IsolatedQaWorkspace } from "../helpers/isolated-qa-workspace";
import { gotoAuthenticated } from "../helpers/staging-auth";
import { expectNoHorizontalOverflow } from "../helpers/assertions";

// Loopback-only fault proxy: actual Django responses, with explicit read failures/delays.
// Run the production Next server with HRMS_API_BASE_URL=http://127.0.0.1:8049/api/v1.
let proxy: Server;
let workspace: IsolatedQaWorkspace;
let closed: { close_id: string; hash: string };
function django(code: string) {
  return execFileSync(path.resolve(__dirname, "../../../.venv/bin/python"), ["backend/manage.py", "shell", "-c", code], { cwd: path.resolve(__dirname, "../../.."), env: process.env, encoding: "utf8" });
}
let fault: { path: string; status?: number; delay?: number } | undefined;
const backend = "http://127.0.0.1:8048";
const evidence = process.env.HRMS_CERT_EVIDENCE_DIR || path.resolve(__dirname, "../../../docs/qa/evidence/ess2-attendance");
async function capture(page: Page, filename: string) {
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  });
  await page.screenshot({ path: path.join(evidence, filename), fullPage: true });
}


test.describe("ESS-2 production attendance", () => {
  test.describe.configure({ mode: "serial" });
  test.setTimeout(90_000);
  test.beforeAll(async ({}, testInfo) => {
    test.setTimeout(120_000);
    if (process.env.POSTGRES_DB !== "hrms_ess2" || process.env.POSTGRES_HOST !== "127.0.0.1") throw new Error("ESS-2 certification requires the dedicated loopback hrms_ess2 database.");
    workspace = await provisionIsolatedQaWorkspace(testInfo);
    closed = JSON.parse(django(`import json; from tests.ess2_browser_fixture import prepare; print(json.dumps(prepare(${JSON.stringify(workspace.manifestPath)})))`).trim().split("\n").at(-1)!);
    proxy = createServer(async (request, response) => {
      try {
        const url = request.url || "/";
        const active = fault?.path === url.split("?")[0] ? fault : undefined;
        if (active?.delay) await new Promise((resolve) => setTimeout(resolve, active.delay));
        if (active?.status) {
          response.writeHead(active.status, { "Content-Type": "application/json" });
          response.end(JSON.stringify({ detail: "Synthetic ESS-2 read failure" }));
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
        response.writeHead(result.status, { "Content-Type": result.headers.get("content-type") || "application/json" });
        response.end(Buffer.from(await result.arrayBuffer()));
      } catch {
        response.writeHead(502); response.end("Synthetic proxy could not reach local backend");
      }
    });
    await new Promise<void>((resolve, reject) => { proxy.once("error", reject); proxy.listen(8049, "127.0.0.1", resolve); });
  });
  const hydrationErrors: string[] = [];
  test.beforeEach(async ({ page }) => {
    hydrationErrors.length = 0;
    page.on("pageerror", (error) => { if (page.url().includes("/ess/attendance") && /hydration|Minified React error #418/i.test(error.message)) hydrationErrors.push(error.message); });
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
      await cleanupIsolatedQaWorkspace(workspace);
      await writeFile(path.join(evidence, `${testInfo.project.name}-fixture-cleanup.json`), JSON.stringify({ seed_ref: workspace?.seedRef, verified_absent: true, finalized_snapshot_preserved: preserved, close_id: closed?.close_id, snapshot_hash: closed?.hash }, null, 2));
      if (proxy) await new Promise<void>((resolve) => proxy.close(() => resolve()));
    }
  });

  test("monthly calendar, stored day detail and tenant timezone", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await gotoAuthenticated(page, "/ess/attendance?month=2029-03&day=2029-03-01", workspacePersona(workspace, "employee"));
    await expect(page.getByRole("heading", { name: "Attendance", exact: true })).toBeVisible();
    await expect(page.getByText(/Times: America\/New_York/)).toBeVisible();
    await expect(page.getByRole("link", { name: "2029-03-01: present", exact: true })).toHaveAttribute("aria-current", "date");
    const checkIn = page.locator(".ess-fields > div").filter({ has: page.getByText("Recorded check-in", { exact: true }) });
    await expect(checkIn).toContainText("28 Feb");
    await expect(checkIn).toContainText(/UTC-05:00/);
    await page.getByRole("link", { name: "2029-03-02: late", exact: true }).click();
    await expect(page.getByRole("heading", { name: /Day details · 02 Mar 2029/ })).toBeVisible();
    await page.getByRole("link", { name: "2029-03-04: weekly off", exact: true }).click();
    await expect(page.locator(".ess-fields")).toContainText("weekly off");
    await page.getByRole("link", { name: "2029-03-05: holiday", exact: true }).click();
    await expect(page.locator(".ess-fields")).toContainText("ESS2 Synthetic Holiday");
    await page.goBack(); await page.goBack();
    await expect(page.getByRole("link", { name: "2029-03-02: late", exact: true })).toHaveAttribute("aria-current", "date");
    await expectNoHorizontalOverflow(page);
    await capture(page, `${test.info().project.name}-attendance-desktop.png`);
  });

  test("list pagination and period selection retain accurate dates", async ({ page }) => {
    await gotoAuthenticated(page, "/ess/attendance?month=2029-03&page_size=5", workspacePersona(workspace, "employee"));
    await page.getByRole("link", { name: "List", exact: true }).click();
    const table = page.getByRole("table", { name: "Attendance days", exact: true });
    await expect(table.locator("tbody tr")).toHaveCount(5);
    await expect(table).toContainText("01 Mar 2029");
    await page.locator('[aria-label="Attendance pagination"]').getByRole("link", { name: "Next", exact: true }).click();
    await expect(table).toContainText("06 Mar 2029");
    await expect(table).not.toContainText("01 Mar 2029");
    const history = page.getByRole("table", { name: "Attendance regularization history", exact: true });
    await expect(history.locator("tbody tr")).toHaveCount(5);
    await page.locator('[aria-label="Regularization pagination"]').getByRole("link", { name: "Next", exact: true }).click();
    await expect(history.locator("tbody tr")).toHaveCount(2);
    await page.getByLabel("Month", { exact: true }).fill("2028-02");
    await page.getByRole("button", { name: "Show period" }).click();
    await expect(page.getByText("No attendance records in this period.", { exact: false })).toBeVisible();
    await page.getByRole("link", { name: "Calendar", exact: true }).click();
    await expect(page.getByRole("link", { name: "2028-02-29: No record", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "2028-02-30: No record", exact: true })).toHaveCount(0);
    await page.getByRole("link", { name: "Next month", exact: true }).click();
    await expect(page.getByLabel("Month", { exact: true })).toHaveValue("2028-03");
    await page.goto("/ess/attendance?month=2028-01");
    await page.getByRole("link", { name: "Previous month", exact: true }).click();
    await expect(page.getByLabel("Month", { exact: true })).toHaveValue("2027-12");
    await page.getByRole("link", { name: "Current period", exact: true }).click();
    await expect(page).toHaveURL("http://127.0.0.1:3149/ess/attendance");
    await expect(page.getByLabel("Month", { exact: true })).not.toHaveValue("2027-12");
    await expect(page.getByTestId("workspace-navigation-status")).toHaveCount(0);
    await expect(page.getByText(/Times: America\/New_York/)).toBeVisible();
    await page.goto("/ess/attendance?month=2029-03&view=list&page=999&page_size=3");
    await expect(page.getByRole("combobox", { name: "Rows per page", exact: true })).toHaveValue("10");
    await expect(table.locator("tbody tr")).toHaveCount(10);
    await expect(table).toContainText("11 Mar 2029");
    await page.goto("/ess/attendance?month=2029-13");
    await expect(page.locator(".ess-attendance").getByRole("alert")).toContainText("The requested month is invalid");
    await expect(page.getByLabel("Month", { exact: true })).not.toHaveValue("2029-13");
  });

  test("historical finalized attendance remains read only", async ({ page }) => {
    await gotoAuthenticated(page, "/ess/attendance?month=2029-02&day=2029-02-15", workspacePersona(workspace, "employee"));
    await expect(page.getByRole("button", { name: "Regularize attendance", exact: true })).toBeDisabled();
    await expect(page.getByText("Finalized / read only", { exact: true })).toBeVisible();
    await expect(page.getByText("Finalized values are shown as stored.", { exact: false })).toBeVisible();
    await expect(page.getByRole("button", { name: "Request correction for this day" })).toHaveCount(0);
    const token = (await page.context().cookies()).find((cookie) => cookie.name === "hrms_access_token")!.value;
    const headers = { Authorization: `Token ${token}` };
    const result = await page.request.get(`${backend}/api/v1/me/attendance-records/?month=2029-02`, { headers });
    const record = (await result.json()).days[0];
    const rejected = await page.request.post(`${backend}/api/v1/me/attendance-regularizations/`, { headers, data: { attendance_record_id: record.id, requested_status: "present", reason: "Synthetic closed day attempt" } });
    expect(rejected.status()).toBe(400);
    django(`from tests.ess2_browser_fixture import verify; verify("${closed.close_id}", "${closed.hash}")`);
  });

  test("correction validates UTC times, recovers network failure and submits once", async ({ page }) => {
    await gotoAuthenticated(page, "/ess/attendance?month=2029-03&day=2029-03-10", workspacePersona(workspace, "employee"));
    await page.getByRole("button", { name: "Request correction for this day" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("button", { name: "Submit correction" })).toBeDisabled();
    await dialog.getByRole("textbox", { name: "Reason", exact: true }).fill(`ESS2 ${test.info().project.name} actual correction`);
    await dialog.getByLabel("Requested check-in", { exact: true }).fill("2029-03-10T09:00");
    await dialog.getByLabel("Requested check-out", { exact: true }).fill("2029-03-10T08:00");
    await expect(dialog.getByRole("button", { name: "Submit correction" })).toBeDisabled();
    await dialog.getByLabel("Requested check-out", { exact: true }).fill("2029-03-10T17:00");
    await page.route("**/api/me/attendance-regularizations", (route) => route.abort("failed"));
    await dialog.getByRole("button", { name: "Submit correction" }).click();
    await expect(dialog.getByText("Unable to reach the server.", { exact: false }).first()).toBeVisible();
    await expect(dialog.getByRole("textbox", { name: "Reason", exact: true })).toHaveValue(`ESS2 ${test.info().project.name} actual correction`);
    await page.unroute("**/api/me/attendance-regularizations");
    await page.route("**/api/me/attendance-records?*", (route) => route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ detail: "Synthetic refresh read failure" }) }));
    const response = page.waitForResponse((res) => res.url().endsWith("/api/me/attendance-regularizations") && res.request().method() === "POST");
    await dialog.getByRole("button", { name: "Submit correction" }).click();
    expect((await response).status()).toBe(201);
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole("status").filter({ hasText: "Attendance regularization submitted." })).toBeVisible();
    await expect(page.locator(".ess-attendance").getByRole("alert")).toContainText("The correction was submitted, but updated records could not be loaded");
    await expect(page.getByRole("button", { name: "Regularize attendance", exact: true })).toBeDisabled();
    await page.unroute("**/api/me/attendance-records?*");
    await page.getByRole("button", { name: "Retry refresh", exact: true }).click();
    await expect(page.getByText("A correction for this day is already awaiting approval.", { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByText("A correction for this day is already awaiting approval.", { exact: true })).toBeVisible();
    const token = (await page.context().cookies()).find((cookie) => cookie.name === "hrms_access_token")!.value;
    const result = await page.request.get(`${backend}/api/v1/me/attendance-regularizations/`, { headers: { Authorization: `Token ${token}` } });
    const matches = (await result.json()).items.filter((item: { reason: string }) => item.reason === `ESS2 ${test.info().project.name} actual correction`);
    expect(matches).toHaveLength(1);
    expect(new Date(matches[0].requested_check_in_at).toISOString()).toBe("2029-03-10T09:00:00.000Z");
    await page.goto(`/ess/attendance?month=2029-03&status=rejected&regId=${matches[0].id}`);
    await expect(page.getByRole("dialog")).toContainText(`ESS2 ${test.info().project.name} actual correction`);
  });

  test("manager rejection and approval are reflected in self status and detail", async ({ page }) => {
    await gotoAuthenticated(page, "/ess/attendance?month=2029-03", workspacePersona(workspace, "employee"));
    const employeeToken = (await page.context().cookies()).find((cookie) => cookie.name === "hrms_access_token")!.value;
    const history = await page.request.get(`${backend}/api/v1/me/attendance-regularizations/`, { headers: { Authorization: `Token ${employeeToken}` } });
    const request = (await history.json()).items.find((item: { reason: string }) => item.reason === `ESS2 ${test.info().project.name} actual correction`);
    expect(request).toBeTruthy();
    await gotoAuthenticated(page, "/mss", workspacePersona(workspace, "manager"));
    const managerToken = (await page.context().cookies()).find((cookie) => cookie.name === "hrms_access_token")!.value;
    const decision = await page.request.post(`${backend}/api/v1/manager/attendance-regularizations/${request.id}/reject/`, { headers: { Authorization: `Token ${managerToken}`, "Idempotency-Key": `ess2-reject-${request.id}` }, data: { comment: "Synthetic ESS2 decision, original daily values retained" } });
    expect(decision.status()).toBe(200);
    await gotoAuthenticated(page, `/ess/attendance?month=2029-03&status=rejected&regId=${request.id}`, workspacePersona(workspace, "employee"));
    const dialog = page.getByRole("dialog");
    await expect(dialog).toContainText("Synthetic ESS2 decision");
    await expect(dialog).toContainText("rejected");
    await dialog.getByRole("button", { name: "Close 10 Mar 2029", exact: true }).click();
    await expect(page.getByRole("table", { name: "Attendance regularization history", exact: true })).toContainText("rejected");
    const selfToken = (await page.context().cookies()).find((cookie) => cookie.name === "hrms_access_token")!.value;
    const month = await page.request.get(`${backend}/api/v1/me/attendance-records/?month=2029-03`, { headers: { Authorization: `Token ${selfToken}` } });
    const day = (await month.json()).days.find((item: { attendance_date: string }) => item.attendance_date === "2029-03-13");
    const submission = await page.request.post(`${backend}/api/v1/me/attendance-regularizations/`, { headers: { Authorization: `Token ${selfToken}`, "Idempotency-Key": `ess2-approved-${day.id}` }, data: { attendance_record_id: day.id, requested_status: "present", reason: "Synthetic ESS2 approved correction", requested_check_in_at: "2029-03-13T09:00:00Z", requested_check_out_at: "2029-03-13T17:00:00Z" } });
    expect(submission.status()).toBe(201);
    const approvedId = (await submission.json()).id;
    await gotoAuthenticated(page, "/mss", workspacePersona(workspace, "manager"));
    const approvalToken = (await page.context().cookies()).find((cookie) => cookie.name === "hrms_access_token")!.value;
    const approved = await page.request.post(`${backend}/api/v1/manager/attendance-regularizations/${approvedId}/approve/`, { headers: { Authorization: `Token ${approvalToken}`, "Idempotency-Key": `ess2-approve-${approvedId}` }, data: { comment: "Synthetic approved decision" } });
    expect(approved.status()).toBe(200);
    await gotoAuthenticated(page, `/ess/attendance?month=2029-03&status=approved&day=2029-03-13&regId=${approvedId}`, workspacePersona(workspace, "employee"));
    await expect(page.getByRole("dialog")).toContainText("approved");
    await page.getByRole("dialog").getByRole("button", { name: "Close 13 Mar 2029", exact: true }).click();
    await expect(page.getByRole("table", { name: "Attendance regularization history", exact: true })).toContainText("approved");
    const updatedToken = (await page.context().cookies()).find((cookie) => cookie.name === "hrms_access_token")!.value;
    const updated = await page.request.get(`${backend}/api/v1/me/attendance-records/?month=2029-03`, { headers: { Authorization: `Token ${updatedToken}` } });
    const changed = (await updated.json()).days.find((item: { id: string }) => item.id === day.id);
    expect(changed.is_regularized).toBe(true);
    expect(new Date(changed.check_in_at).toISOString()).toBe("2029-03-13T09:00:00.000Z");
  });

  test("direct API ignores retargeting and rejects writes and privileged reads", async ({ page, playwright }) => {
    await gotoAuthenticated(page, "/ess/attendance?month=2029-03", workspacePersona(workspace, "employee"));
    const token = (await page.context().cookies()).find((cookie) => cookie.name === "hrms_access_token")!.value;
    const headers = { Authorization: `Token ${token}` };
    const result = await page.request.get(`${backend}/api/v1/me/attendance-records/?month=2029-03&employee_id=${workspace.manifest.credentials.manager.employee_id}`, { headers });
    expect(result.status()).toBe(200);
    expect((await result.json()).total_count).toBe(20);
    expect((await page.request.patch(`${backend}/api/v1/me/attendance-records/?month=2029-03`, { headers, data: { status: "absent" } })).status()).toBe(405);
    expect((await page.request.get(`${backend}/api/v1/hr-admin/attendance-records/`, { headers })).status()).toBe(403);
    const anonymous = await page.request.get(`${backend}/api/v1/me/attendance-records/?month=2029-03`);
    expect([401, 403]).toContain(anonymous.status());
    const proxied = await page.request.get("/api/me/attendance-records?month=2029-03&employee_id=" + workspace.manifest.credentials.manager.employee_id);
    expect(proxied.status()).toBe(200);
    expect((await proxied.json()).total_count).toBe(20);
    const unauthenticated = await playwright.request.newContext({ baseURL: "http://127.0.0.1:3149" });
    try {
      expect((await unauthenticated.get("/api/me/attendance-records?month=2029-03")).status()).toBe(401);
      expect((await unauthenticated.get("/api/me/attendance-regularizations")).status()).toBe(401);
    } finally { await unauthenticated.dispose(); }
  });

  test("read failure, retry and accessible loading recover", async ({ page }) => {
    await gotoAuthenticated(page, "/ess/attendance?month=2029-03", workspacePersona(workspace, "employee"));
    fault = { path: "/api/v1/me/attendance-records/", status: 503 };
    await page.goto("/ess/attendance?month=2029-03");
    await expect(page.getByRole("heading", { name: "Employee information is unavailable" })).toBeVisible();
    fault = undefined;
    await page.getByRole("button", { name: "Retry workspace" }).click();
    await expect(page.getByRole("heading", { name: "Attendance", exact: true })).toBeVisible();
    fault = { path: "/api/v1/me/attendance-records/", delay: 2500 };
    const navigation = page.goto("/ess/attendance?month=2031-11&probe=ess2-slow");
    await expect(page.getByRole("status", { name: "Loading employee workspace", exact: true })).toBeVisible();
    await navigation;
    await expect(page.getByRole("heading", { name: "Attendance", exact: true })).toBeVisible();
    await expect(page.getByRole("status", { name: "Loading employee workspace", exact: true })).toHaveCount(0);
  });

  test("mobile/tablet density, keyboard and dialog focus", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await gotoAuthenticated(page, "/ess/attendance?month=2029-03&day=2029-03-11", workspacePersona(workspace, "employee"));
    for (const width of [768, 390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      await expectNoHorizontalOverflow(page);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    const key = page.locator(".ess-attendance-calendar__key");
    await key.locator("summary").focus(); await page.keyboard.press("Enter");
    await expect(key).toHaveAttribute("open", "");
    await expect(key).toContainText("F Finalized");
    await key.locator("summary").press("Enter");
    await capture(page, `${test.info().project.name}-attendance-mobile.png`);
    const date = page.getByRole("link", { name: "2029-03-12: present", exact: true });
    await date.focus(); await date.press("Enter");
    await expect(date).toHaveAttribute("aria-current", "date");
    await expect(page.locator(".ess-fields > div").filter({ has: page.getByText("Recorded check-in", { exact: true }) })).toContainText(/UTC-04:00/);
    await page.getByRole("button", { name: "Request correction for this day" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.locator(":focus")).toHaveCount(1);
    await page.keyboard.press("Shift+Tab");
    await expect(dialog.getByRole("button", { name: "Close Regularize attendance", exact: true })).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(dialog.locator(":focus")).toHaveCount(1);
    await page.keyboard.press("Tab");
    await expect(dialog.getByRole("button", { name: "Close Regularize attendance", exact: true })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Request correction for this day" })).toBeFocused();
    await page.getByRole("link", { name: "List", exact: true }).click();
    await expectNoHorizontalOverflow(page);
    const region = page.getByRole("region", { name: "Attendance records", exact: true });
    await region.focus(); await expect(region).toBeFocused();
    await region.press("ArrowRight");
    await expect.poll(() => region.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
    await region.evaluate((element) => { element.scrollLeft = 0; });
    await capture(page, `${test.info().project.name}-attendance-list-mobile.png`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await page.setViewportSize({ width: 768, height: 844 });
    await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
    await expectNoHorizontalOverflow(page);
  });
});
