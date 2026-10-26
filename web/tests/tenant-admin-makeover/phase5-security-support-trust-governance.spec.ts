import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

import {
  cleanupIsolatedQaWorkspace,
  provisionIsolatedQaWorkspace,
  type IsolatedQaWorkspace,
  workspacePersona,
} from "../helpers/isolated-qa-workspace";

test.describe.configure({ mode: "serial" });

const repoRoot = path.resolve(__dirname, "../../..");
const evidence = path.join(repoRoot, "docs/qa/evidence/tenant-admin-makeover-phase5-2026-10-26");
let workspace: IsolatedQaWorkspace;

async function login(page: Page, username: string, password = "Password@123") {
  await page.request.post("/api/auth/logout").catch(() => null);
  await page.context().clearCookies();
  const response = await page.request.post("/api/auth/login", { data: { identifier: username, password } });
  expect(response.ok()).toBeTruthy();
}

async function loginAsTenantAdmin(page: Page) {
  const persona = workspacePersona(workspace, "tenant_admin");
  await login(page, persona.username, persona.password);
}

async function expectNoOverflow(page: Page) {
  const widths = await page.evaluate(() => ({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
  expect(widths.scroll).toBeLessThanOrEqual(widths.client + 1);
}

async function axeScan(page: Page, name: string) {
  await page.addScriptTag({ path: require.resolve("axe-core/axe.min.js") });
  const result = await page.evaluate(async () => {
    const axe = (window as unknown as { axe: { run: (root: Element, options: object) => Promise<{ violations: unknown[] }> } }).axe;
    return axe.run(document.querySelector("main")!, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] } });
  });
  writeFileSync(path.join(evidence, `${test.info().project.name}-${name}-axe.json`), JSON.stringify(result, null, 2));
  expect(result.violations).toEqual([]);
}

test.beforeAll(async ({}, info) => {
  mkdirSync(evidence, { recursive: true });
  workspace = await provisionIsolatedQaWorkspace(info);
});

test.afterAll(async () => cleanupIsolatedQaWorkspace(workspace));

test("four governance workspaces share compact responsive hierarchy", async ({ page }) => {
  await loginAsTenantAdmin(page);
  const routes = [
    ["/tenant-admin/security-readiness", "Enterprise Security Readiness", "Security readiness summary"],
    ["/tenant-admin/support-access", "Support Access", "Support access summary"],
    ["/tenant-admin/trust-audit", "Tenant Trust Audit", "Trust audit summary"],
    ["/tenant-admin/data-governance", "Data retention and exports", "Data governance summary"],
  ] as const;
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    for (const [route, heading, summary] of routes) {
      await page.goto(route);
      await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
      await expect(page.getByRole("group", { name: summary }).locator("article")).toHaveCount(4);
      await expectNoOverflow(page);
      const slug = route.split("/").pop()!;
      await page.screenshot({ path: path.join(evidence, `${test.info().project.name}-${slug}-${width}.png`), fullPage: true, animations: "disabled" });
      if (width === 390) await axeScan(page, slug);
    }
  }
});

test("support lifecycle is compact, audited, and preserves uncertain decisions", async ({ page }) => {
  await loginAsTenantAdmin(page);
  await page.goto("/tenant-admin/support-access");
  const suffix = `${test.info().project.name}-${Date.now()}`;
  const reason = `Phase 5 governed support ${suffix}`;
  const form = page.getByTestId("tenant-support-access-form");
  await form.getByLabel("Support agent").fill(`support.${suffix}@example.test`);
  await form.getByLabel("Reason").fill(reason);
  const createdResponsePromise = page.waitForResponse((response) => response.url().includes("/api/tenant-admin/support-access-grants") && response.request().method() === "POST");
  await form.getByRole("button", { name: "Request access" }).click();
  const createdResponse = await createdResponsePromise;
  expect(createdResponse.status()).toBe(201);
  expect((await createdResponse.json()).console).toBeUndefined();
  const row = page.locator(".tenant-support-access-row").filter({ hasText: reason }).first();
  await expect(row).toContainText("Requested");
  await row.getByLabel("Decision note").fill("Independent bounded-access review completed.");
  const approvedResponsePromise = page.waitForResponse((response) => response.url().includes("/api/tenant-admin/support-access-grants/") && response.request().method() === "PATCH");
  await row.getByRole("button", { name: "Approve" }).click();
  const approvedResponse = await approvedResponsePromise;
  expect(approvedResponse.ok()).toBeTruthy();
  expect((await approvedResponse.json()).console).toBeUndefined();
  await expect(row).toContainText("Approved");
  await row.getByLabel("Session ref").fill(`session-${suffix}`);
  await row.getByRole("button", { name: "Start session" }).click();
  await expect(row).toContainText("Active");
  await row.getByRole("button", { name: "End session" }).click();
  await expect(row).toContainText("Ended");

  await form.getByLabel("Support agent").fill(`uncertain.${suffix}@example.test`);
  await form.getByLabel("Reason").fill(`Unconfirmed support request ${suffix}`);
  await page.route("**/api/tenant-admin/support-access-grants", (route) => route.abort("connectionreset"), { times: 1 });
  await form.getByRole("button", { name: "Request access" }).click();
  await expect(form.getByRole("alert").filter({ hasText: "outcome is unconfirmed" })).toBeVisible();
  await expect(form.getByLabel("Support agent")).toHaveValue(`uncertain.${suffix}@example.test`);
  await expect(form.getByLabel("Reason")).toHaveValue(`Unconfirmed support request ${suffix}`);

  await page.goto(`/tenant-admin/trust-audit?event_group=support&support_session_ref=session-${suffix}`);
  await expect(page.getByText(`Session: session-${suffix}`)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Evidence ledger" })).toBeVisible();
});

test("security remediation, audit filters, pagination, and export remain governed", async ({ page }) => {
  await loginAsTenantAdmin(page);
  await page.goto("/tenant-admin/security-readiness");
  await expect(page.getByRole("heading", { name: "Launch posture" })).toBeVisible();
  const unresolved = page.locator(".tenant-governance-row").filter({ has: page.getByRole("link") });
  if (await unresolved.count()) await expect(unresolved.first().getByRole("link")).toBeVisible();

  await page.goto("/tenant-admin/trust-audit?page_size=3");
  await page.getByRole("main").getByText("Support access", { exact: true }).first().click();
  await expect(page).toHaveURL(/event_group=support/);
  await expect(page.getByText("Group: Support")).toBeVisible();
  await page.reload();
  await expect(page.getByText("Group: Support")).toBeVisible();
  await expect(page.getByLabel("Trust audit pagination")).toBeVisible();
  const download = await page.request.get("/api/tenant-admin/commercial-support-audit/download");
  expect(download.ok()).toBeTruthy();
  expect(download.headers()["content-type"]).toContain("application/json");
  const body = await download.json();
  expect(body.evidence_checksum_sha256).toMatch(/^[a-f0-9]{64}$/);
});

test("governance requests preserve uncertain input and employee access is denied", async ({ page }) => {
  await loginAsTenantAdmin(page);
  await page.goto("/tenant-admin/data-governance");
  const form = page.getByRole("heading", { name: "Governed data request" }).locator("xpath=ancestor::section").locator("form");
  const suffix = `${test.info().project.name}-${Date.now()}`;
  const reason = `Phase 5 protected export ${suffix}`;
  await form.getByRole("checkbox").first().check();
  await form.getByLabel("Business reason").fill(reason);
  const responsePromise = page.waitForResponse((response) => response.url().includes("/api/tenant-admin/data-governance/requests") && response.request().method() === "POST");
  await form.getByRole("button", { name: "Submit request" }).click();
  expect((await responsePromise).status()).toBe(201);
  const requestRegister = page.getByLabel("Governance request status table");
  await expect(requestRegister).toContainText(reason);
  await expect(requestRegister).toContainText("requested");

  const uncertainReason = `Unconfirmed governed export ${suffix}`;
  await form.getByRole("checkbox").first().check();
  await form.getByLabel("Business reason").fill(uncertainReason);
  await page.route("**/api/tenant-admin/data-governance/requests", (route) => route.abort("connectionreset"), { times: 1 });
  await form.getByRole("button", { name: "Submit request" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "outcome is unconfirmed" })).toBeVisible();
  await expect(form.getByLabel("Business reason")).toHaveValue(uncertainReason);
  await expect(form.getByRole("checkbox").first()).toBeChecked();

  const employee = workspacePersona(workspace, "employee");
  await login(page, employee.username, employee.password);
  for (const route of ["/api/tenant-admin/security-readiness", "/api/tenant-admin/trust-audit", "/api/tenant-admin/data-governance", "/api/tenant-admin/support-access-grants"]) {
    const response = await page.request.get(route);
    expect([403, 405]).toContain(response.status());
  }
  await page.goto("/tenant-admin/data-governance");
  await expect(page).not.toHaveURL(/\/tenant-admin\/data-governance/);
});
