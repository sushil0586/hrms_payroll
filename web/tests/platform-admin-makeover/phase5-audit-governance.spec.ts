import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

import {
  cleanupIsolatedQaWorkspace,
  provisionIsolatedQaWorkspace,
  type IsolatedQaWorkspace,
  workspacePersona,
  workspacePlatformPersona,
} from "../helpers/isolated-qa-workspace";

test.describe.configure({ mode: "serial" });

const repoRoot = path.resolve(__dirname, "../../..");
const evidence = path.join(repoRoot, "docs/qa/evidence/platform-admin-makeover-phase5-2026-10-26");
let workspace: IsolatedQaWorkspace;

async function login(page: Page, role: "platform_admin" | "tenant_admin" | "employee" = "platform_admin") {
  const persona = role === "platform_admin" ? workspacePlatformPersona(workspace) : workspacePersona(workspace, role);
  await page.request.post("/api/auth/logout").catch(() => null);
  await page.context().clearCookies();
  const response = await page.request.post("/api/auth/login", { data: { identifier: persona.username, password: persona.password } });
  expect(response.ok(), await response.text()).toBeTruthy();
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

function seedAuditEvidence() {
  const onboardingId = workspace.manifest.fixtures.platform_onboarding_id;
  execFileSync(path.join(repoRoot, ".venv/bin/python"), ["backend/manage.py", "shell", "-c", [
    "from apps.tenant_onboarding.models import TenantOnboardingEvent",
    `onboarding_id='${onboardingId}'`,
    "[TenantOnboardingEvent.objects.create(onboarding_id=onboarding_id,event_type='phase5_evidence',summary=f'Phase 5 evidence {i}',actor_identifier='phase5.operator',payload={'sequence':i,'password':'Password@123','nested':{'access_token':'secret-token','safe':'visible'}}) for i in range(11)]",
  ].join("; ")], { cwd: repoRoot, env: process.env, stdio: "pipe" });
}

async function submitRequest(page: Page, type: "export" | "erasure", reason: string) {
  const section = page.getByRole("heading", { name: "Governed data request" }).locator("xpath=ancestor::section[1]");
  await section.getByLabel("Request type").selectOption(type);
  await section.getByLabel("employee documents").check();
  await section.getByLabel("Business reason").fill(reason);
  const response = page.waitForResponse((item) => item.url().includes("/api/tenant-admin/data-governance/requests") && item.request().method() === "POST");
  await section.getByRole("button", { name: "Submit request" }).click();
  expect((await response).status()).toBe(201);
}

test.beforeAll(async ({}, info) => {
  mkdirSync(evidence, { recursive: true });
  workspace = await provisionIsolatedQaWorkspace(info);
  seedAuditEvidence();
});

test.afterAll(async () => {
  await cleanupIsolatedQaWorkspace(workspace);
});

test("renders compact audit and governance workspaces responsively with accessibility coverage", async ({ page }) => {
  const tenantId = workspace.manifest.tenant.id;
  const routes = [
    [`/platform-admin/audit-logs?tenantId=${tenantId}`, "Audit Logs", "Audit evidence summary", "audit"],
    [`/platform-admin/data-governance?tenantId=${tenantId}`, "Retention and controlled erasure", "Platform data governance summary", "governance"],
  ] as const;
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 760 : 900 });
    for (const [url, heading, summary, slug] of routes) {
      await login(page);
      await page.goto(url, { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
      await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
      await expect(page.getByRole("group", { name: summary }).locator("article")).toHaveCount(4);
      await expect(page.getByText("Next required action", { exact: true }).first()).toBeVisible();
      await expectNoOverflow(page);
      await page.screenshot({ path: path.join(evidence, `${test.info().project.name}-${slug}-${width}.png`), fullPage: true, animations: "disabled" });
      if (width === 390) await axeScan(page, slug);
    }
  }
});

test("persists audit scope, paginates evidence, distinguishes no matches, and redacts secrets", async ({ page }) => {
  const tenantId = workspace.manifest.tenant.id;
  await login(page);
  await page.goto(`/platform-admin/audit-logs?tenantId=${tenantId}&q=Phase+5&evidenceType=ignored&eventType=phase5_evidence`);
  const panel = page.getByTestId("platform-admin-events-panel");
  await expect(panel.locator('[name="q"]')).toHaveValue("Phase 5");
  await expect(panel.locator('[name="eventType"]')).toHaveValue("phase5_evidence");
  await expect(panel.getByText("of 10 audit events")).toBeVisible();
  await expect(panel.getByRole("button", { name: "Next" })).toBeEnabled();
  await page.reload();
  await expect(panel.locator('[name="q"]')).toHaveValue("Phase 5");
  await panel.getByRole("button", { name: /View evidence for Phase5 Evidence/i }).first().click();
  const dialog = page.getByRole("dialog", { name: "Phase5 Evidence" });
  await expect(dialog.getByLabel("Audit evidence payload")).toContainText("[redacted]");
  await expect(dialog.getByLabel("Audit evidence payload")).toContainText("visible");
  await expect(dialog.getByLabel("Audit evidence payload")).not.toContainText("Password@123");
  await dialog.getByRole("button", { name: /close/i }).click();
  await panel.locator('[name="q"]').fill("does-not-exist");
  await panel.getByRole("button", { name: "Apply evidence scope" }).click();
  await expect(page).toHaveURL(/q=does-not-exist.*eventType=phase5_evidence/);
  await expect(panel.getByText("No onboarding events match this view.")).toBeVisible();
  await panel.getByRole("button", { name: "Reset filters" }).click();
  await expect(page).toHaveURL(new RegExp(`audit-logs\\?tenantId=${tenantId}$`));
  await page.goto("/platform-admin/audit-logs?tenantId=00000000-0000-0000-0000-000000000000&q=Phase+5");
  await expect(page).toHaveURL(new RegExp(`tenantId=${tenantId}.*q=Phase\\+5`));
});

test("enforces policy evidence, legal holds, maker-checker approval, and disabled erasure", async ({ page }) => {
  const tenantId = workspace.manifest.tenant.id;
  const suffix = `${test.info().project.name}-${Date.now()}`;
  const exportReason = `Phase 5 export ${suffix}`;
  const erasureReason = `Phase 5 erasure ${suffix}`;
  await login(page, "tenant_admin");
  await page.goto("/tenant-admin/data-governance");
  await submitRequest(page, "export", exportReason);
  await submitRequest(page, "erasure", erasureReason);

  await login(page);
  await page.goto(`/platform-admin/data-governance?tenantId=${tenantId}`);
  const policy = page.getByRole("heading", { name: "Retention policy configuration" }).locator("xpath=ancestor::section[1]");
  await expect(policy.getByLabel("Tenant")).toHaveValue(tenantId);
  await policy.getByLabel("Jurisdiction").fill(`IN-${suffix}`);
  await policy.getByLabel("Record category").selectOption("employee_documents");
  await policy.getByLabel("Retention days").fill("365");
  await policy.getByLabel("Lifecycle date field").fill("updated_at");
  await policy.getByLabel("Effective from").fill("2026-01-01");
  await policy.getByLabel("Legal basis reference").fill(`LEGAL-${suffix}`);
  await policy.getByLabel("Approval reference").fill(`APPROVAL-${suffix}`);
  await policy.getByRole("button", { name: "Save approved policy" }).click();
  await expect(page.getByText("Retention policy recorded.")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("row").filter({ hasText: `APPROVAL-${suffix}` })).toContainText("approved");

  const hold = page.getByRole("heading", { name: "Legal holds" }).locator("xpath=ancestor::section[1]");
  await hold.getByLabel("Category").selectOption("employee_documents");
  await hold.getByLabel("Authority reference").fill(`HOLD-${suffix}`);
  await hold.getByLabel("Reason").fill("Preserve records for Phase 5 certification");
  await hold.getByRole("button", { name: "Place legal hold" }).click();
  await expect(page.getByText("Legal hold placed.")).toBeVisible();
  await page.reload();
  const release = page.getByRole("heading", { name: "Active and released holds" }).locator("xpath=ancestor::section[1]");
  await release.getByLabel("Release reason").fill("Same actor must not release this hold");
  await release.getByRole("button", { name: "Release legal hold" }).click();
  await expect(page.locator(".form-error")).toContainText(/placer cannot release|different|independent/i);

  for (const reason of [exportReason, erasureReason]) {
    const row = page.getByRole("row").filter({ hasText: reason });
    await row.getByRole("button", { name: "Approve" }).click();
    await expect(page.getByText("Request approved.")).toBeVisible();
    await page.reload();
    await expect(page.getByRole("row").filter({ hasText: reason })).toContainText("approved");
  }
  const erasureRow = page.getByRole("row").filter({ hasText: erasureReason });
  await erasureRow.getByRole("button", { name: "Queue job" }).click();
  await expect(page.getByText("Request queued.")).toBeVisible();
  await expect.poll(async () => { await page.reload(); return await page.getByRole("row").filter({ hasText: erasureReason }).textContent(); }, { timeout: 30_000 }).toContain("blocked");
  await expect(page.getByText("Irreversible erasure is disabled by deployment policy.")).toBeVisible();
});

test("preserves uncertain governance input and denies employee route and API access", async ({ page }) => {
  const tenantId = workspace.manifest.tenant.id;
  await login(page);
  await page.goto(`/platform-admin/data-governance?tenantId=${tenantId}`);
  const policy = page.getByRole("heading", { name: "Retention policy configuration" }).locator("xpath=ancestor::section[1]");
  await policy.getByLabel("Jurisdiction").fill("IN-INTERRUPTED");
  await policy.getByLabel("Record category").selectOption("workflow_audit");
  await policy.getByLabel("Retention days").fill("90");
  await policy.getByLabel("Lifecycle date field").fill("created_at");
  await policy.getByLabel("Effective from").fill("2026-01-01");
  await policy.getByLabel("Legal basis reference").fill("LEGAL-INTERRUPTED");
  await policy.getByLabel("Approval reference").fill("APPROVAL-INTERRUPTED");
  const abort = async (route: import("@playwright/test").Route) => route.abort("connectionreset");
  await page.route("**/api/platform/data-governance", abort);
  await policy.getByRole("button", { name: "Save approved policy" }).click();
  await expect(page.locator(".form-error")).toContainText("outcome is unconfirmed");
  await expect(policy.getByLabel("Jurisdiction")).toHaveValue("IN-INTERRUPTED");
  await expect(policy.getByLabel("Approval reference")).toHaveValue("APPROVAL-INTERRUPTED");
  await page.unroute("**/api/platform/data-governance", abort);

  await login(page, "employee");
  expect([401, 403]).toContain((await page.request.get(`/api/platform/data-governance?tenant_id=${tenantId}`, { failOnStatusCode: false })).status());
  expect([401, 403]).toContain((await page.request.post("/api/platform/data-governance/legal-holds", { data: { tenant_id: tenantId }, failOnStatusCode: false })).status());
  await page.goto(`/platform-admin/data-governance?tenantId=${tenantId}`);
  await expect(page).not.toHaveURL(/\/platform-admin\/data-governance/);
});
