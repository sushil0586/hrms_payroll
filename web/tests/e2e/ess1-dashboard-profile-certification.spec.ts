import { createServer, type Server } from "node:http";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { cleanupIsolatedQaWorkspace, provisionIsolatedQaWorkspace, workspacePersona, type IsolatedQaWorkspace } from "../helpers/isolated-qa-workspace";
import { gotoAuthenticated } from "../helpers/staging-auth";
import { expectNoHorizontalOverflow } from "../helpers/assertions";

// Loopback-only fault proxy: actual Django responses, with explicit read failures/delays.
// Run the production Next server with HRMS_API_BASE_URL=http://127.0.0.1:8039/api/v1.
let proxy: Server;
let workspace: IsolatedQaWorkspace;
let fault: { path: string; status?: number; delay?: number } | undefined;
const backend = "http://127.0.0.1:8038";
const evidence = process.env.HRMS_CERT_EVIDENCE_DIR || path.resolve(__dirname, "../../../docs/qa/evidence/ess1-dashboard-profile");

test.describe("ESS-1 production dashboard and self profile", () => {
  test.describe.configure({ mode: "serial" });
  test.setTimeout(90_000);
  test.beforeAll(async ({}, testInfo) => {
    test.setTimeout(120_000);
    if (process.env.POSTGRES_DB !== "hrms_ess1" || process.env.POSTGRES_HOST !== "127.0.0.1") throw new Error("ESS-1 certification requires the dedicated loopback hrms_ess1 database.");
    workspace = await provisionIsolatedQaWorkspace(testInfo);
    proxy = createServer(async (request, response) => {
      try {
        const url = request.url || "/";
        const active = fault?.path === url.split("?")[0] ? fault : undefined;
        if (active?.delay) await new Promise((resolve) => setTimeout(resolve, active.delay));
        if (active?.status) {
          response.writeHead(active.status, { "Content-Type": "application/json" });
          response.end(JSON.stringify({ detail: "Synthetic ESS-1 read failure" }));
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
    await new Promise<void>((resolve, reject) => { proxy.once("error", reject); proxy.listen(8039, "127.0.0.1", resolve); });
  });
  const runtimeErrors: string[] = [];
  test.beforeEach(({ page }) => {
    runtimeErrors.length = 0;
    page.on("pageerror", error => runtimeErrors.push(error.message));
  });
  test.afterEach(() => {
    fault = undefined;
    expect(runtimeErrors, "Employee navigation must raise no uncaught errors, including session changes").toEqual([]);
  });
  test.afterAll(async () => {
    try { await cleanupIsolatedQaWorkspace(workspace); }
    finally { if (proxy) await new Promise<void>((resolve) => proxy.close(() => resolve())); }
  });

  test("truthful dashboard, canonical actions and desktop screenshot", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await gotoAuthenticated(page, "/ess", workspacePersona(workspace, "employee"));
    await expect(page.getByRole("heading", { name: "My workspace", exact: true })).toBeVisible();
    await expect(page.getByText(workspace.manifest.credentials.employee.employee_code, { exact: false }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Awaiting approval" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Employee services" })).toBeVisible();
    await expect(page.getByText("Ready", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Today's actions", { exact: true })).toHaveCount(0);
    const token = (await page.context().cookies()).find((cookie) => cookie.name === "hrms_access_token")!.value;
    const response = await page.request.get(`${backend}/api/v1/me/dashboard/`, { headers: { Authorization: `Token ${token}` } });
    expect(response.status()).toBe(200);
    const data = await response.json();
    const pending = page.locator(".ess-request-list");
    await expect(pending.getByText(`${data.leave.pending_requests_count} pending`).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "View pending leave" })).toHaveAttribute("href", "/ess/leave?status=pending");
    await expect(page.getByRole("link", { name: "Apply leave", exact: true })).toHaveAttribute("href", "/ess/leave#apply-leave");
    await expect(page.getByRole("link", { name: "Regularize attendance", exact: true })).toHaveAttribute("href", "/ess/attendance#regularize-attendance");
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: path.join(evidence, `${test.info().project.name}-dashboard-desktop.png`), fullPage: true });
    await page.getByRole("link", { name: "My Profile", exact: true }).last().click();
    await expect(page.getByRole("heading", { name: "My Profile", exact: true })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Profile sections" })).toBeVisible();
    await page.screenshot({ path: path.join(evidence, `${test.info().project.name}-profile-desktop.png`), fullPage: true });
  });

  test("all profile sections, read-only permissions and canonical document links", async ({ page }) => {
    await gotoAuthenticated(page, "/ess/profile", workspacePersona(workspace, "employee"));
    const token = (await page.context().cookies()).find((cookie) => cookie.name === "hrms_access_token")!.value;
    const ownResponse = await page.request.get(`${backend}/api/v1/me/profile/`, { headers: { Authorization: `Token ${token}` } });
    expect(ownResponse.status()).toBe(200);
    const ownProfile = await ownResponse.json() as Record<string, string | null>;
    const nav = page.getByRole("navigation", { name: "Profile sections" });
    for (const [label, heading] of [["Personal details", "Personal details"], ["Contact information", "Contact information"], ["Employment & organization", "Employment & organization"], ["Payroll & documents", "Payroll & documents"], ["Access & updates", "Access & updates"]]) {
      await nav.getByRole("link", { name: label, exact: true }).click();
      await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
      await expect(nav.getByRole("link", { name: label, exact: true })).toHaveAttribute("aria-current", "page");
      const expectedFields = label === "Contact information" ? [["Work email", "work_email"], ["Personal email", "personal_email"], ["Phone number", "phone_number"]]
        : label === "Employment & organization" ? [["Manager", "reporting_manager"], ["Department", "department"], ["Legal entity", "legal_entity"], ["Location", "location"]]
        : label === "Personal details" ? [["Full name", "full_name"], ["Preferred name", "preferred_name"]] : [];
      for (const [fieldLabel, fieldKey] of expectedFields) {
        const row = page.locator(".ess-fields > div").filter({ has: page.getByText(fieldLabel, { exact: true }) });
        await expect(row.locator("dd")).toHaveText(ownProfile[fieldKey] || "Not recorded");
      }
    }
    await expect(page.getByRole("table", { name: "Profile field permissions" })).toContainText("No profile fields are currently available for direct editing.");
    await expect(page.getByRole("button", { name: /save|edit|request change|reveal/i })).toHaveCount(0);
    await page.goBack();
    await expect(page.getByRole("heading", { name: "Payroll & documents", exact: true })).toBeVisible();
    await page.getByRole("link", { name: "View published payslips" }).click();
    await expect(page.getByRole("heading", { name: "Payslips", exact: true })).toBeVisible();
    await page.goto("/ess/profile?section=unknown");
    await expect(page.getByRole("heading", { name: "Overview", exact: true })).toBeVisible();
  });

  test("phone/tablet/reflow, keyboard navigation and final mobile screenshots", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await gotoAuthenticated(page, "/ess", workspacePersona(workspace, "employee"));
    for (const width of [768, 390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      await expectNoHorizontalOverflow(page);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: path.join(evidence, `${test.info().project.name}-dashboard-mobile.png`), fullPage: true });
    await page.goto("/ess/profile?section=contact");
    await expect(page.getByRole("heading", { name: "Contact information", exact: true })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: path.join(evidence, `${test.info().project.name}-profile-mobile.png`), fullPage: true });
    await expect(page.getByLabel("Profile section", { exact: true })).toHaveValue("contact");
    await page.getByLabel("Profile section", { exact: true }).selectOption("employment");
    await expect(page.getByRole("heading", { name: "Employment & organization", exact: true })).toBeVisible();
    await page.setViewportSize({ width: 768, height: 844 });
    const employment = page.getByRole("navigation", { name: "Profile sections" }).getByRole("link", { name: "Employment & organization" });
    await employment.focus();
    await employment.press("Enter");
    await expect(page.getByRole("heading", { name: "Employment & organization", exact: true })).toBeVisible();
    await page.setViewportSize({ width: 320, height: 844 });
    await expectNoHorizontalOverflow(page);
    await page.setViewportSize({ width: 768, height: 844 });
    await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
    await expectNoHorizontalOverflow(page);
    const skip = page.getByRole("link", { name: "Skip to employee content" });
    await skip.focus();
    await expect(skip).toBeVisible();
    await skip.press("Enter");
    await expect(page.locator("#ess-content")).toBeFocused();
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  });

  test("server read failure is honest and retry restores employee information", async ({ page }) => {
    await gotoAuthenticated(page, "/ess", workspacePersona(workspace, "employee"));
    for (const [url, endpoint, heading] of [["/ess/profile?section=contact", "/api/v1/me/profile/", "My Profile"], ["/ess", "/api/v1/me/dashboard/", "My workspace"]]) {
      fault = { path: endpoint, status: 503 };
      await page.goto(url);
      await expect(page.getByRole("heading", { name: "Employee information is unavailable" })).toBeVisible();
      await expect(page.getByRole("main").getByRole("alert")).toContainText("could not load");
      await expect(page.locator(".ess-identity")).toHaveCount(0);
      fault = undefined;
      await page.getByRole("button", { name: "Retry workspace" }).click();
      await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
    }
  });

  test("delayed profile renders accessible loading and completes", async ({ page }) => {
    await gotoAuthenticated(page, "/ess", workspacePersona(workspace, "employee"));
    fault = { path: "/api/v1/me/profile/", delay: 2500 };
    const navigation = page.goto("/ess/profile?section=personal&probe=slow");
    await expect(page.getByRole("status", { name: "Loading employee workspace" })).toBeVisible();
    await navigation;
    await expect(page.getByRole("heading", { name: "Personal details", exact: true })).toBeVisible();
    await expect(page.getByRole("status", { name: "Loading employee workspace" })).toHaveCount(0);
  });

  test("a stalled self read times out and retry recovers", async ({ page }) => {
    await gotoAuthenticated(page, "/ess", workspacePersona(workspace, "employee"));
    fault = { path: "/api/v1/me/profile/", delay: 17_000 };
    await page.goto("/ess/profile?section=personal&probe=timeout");
    await expect(page.getByRole("heading", { name: "Employee information is unavailable" })).toBeVisible({ timeout: 25_000 });
    fault = undefined;
    await page.getByRole("button", { name: "Retry workspace" }).click();
    await expect(page.getByRole("heading", { name: "Personal details", exact: true })).toBeVisible();
  });

  test("dashboard launch links open the real leave and attendance forms", async ({ page }) => {
    await gotoAuthenticated(page, "/ess", workspacePersona(workspace, "employee"));
    await page.getByRole("link", { name: "Apply leave", exact: true }).click();
    const leave = page.getByRole("dialog", { name: "Apply leave", exact: true });
    await expect(leave).toBeVisible();
    await expect(leave.getByLabel("Leave type")).toBeVisible();
    await leave.getByRole("button", { name: "Close Apply leave", exact: true }).click();
    await expect(leave).toHaveCount(0);
    await page.reload();
    await expect(leave).toHaveCount(0);
    await page.goto("/ess");
    await page.getByRole("link", { name: "Regularize attendance", exact: true }).click();
    const attendance = page.getByRole("dialog", { name: "Regularize attendance", exact: true });
    await expect(attendance).toBeVisible();
    await expect(attendance.getByLabel("Attendance record")).toBeVisible();
    await attendance.getByRole("button", { name: "Close Regularize attendance", exact: true }).click();
    await expect(attendance).toHaveCount(0);
    await page.reload();
    await expect(attendance).toHaveCount(0);
  });

  test("session/identity isolation and privileged route rejection", async ({ page }) => {
    await gotoAuthenticated(page, "/ess/profile", workspacePersona(workspace, "employee"));
    await page.request.post("/api/auth/logout");
    await page.goto("/ess/profile?section=contact");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator(".ess-identity")).toHaveCount(0);
    await gotoAuthenticated(page, "/ess/profile", workspacePersona(workspace, "manager"));
    await expect(page.locator(".ess-identity")).toContainText(workspace.manifest.credentials.manager.employee_code);
    await expect(page.locator(".ess-identity")).not.toContainText(workspace.manifest.credentials.employee.employee_code);
    await page.goto("/ess");
    await expect(page.getByText("No requests awaiting approval.", { exact: true })).toBeVisible();
    await gotoAuthenticated(page, "/ess/profile", workspacePersona(workspace, "employee"));
    for (const url of ["/hr-admin/employees", "/mss/approvals", "/platform-admin"]) {
      await page.goto(url);
      await expect(page).not.toHaveURL(new RegExp(`${url.replaceAll("/", "\\/")}(?:\\?|$)`));
    }
  });
});
