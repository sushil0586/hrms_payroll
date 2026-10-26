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
const evidence = path.join(repoRoot, "docs/qa/evidence/tenant-admin-makeover-phase4-2026-10-26");
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

async function grantFiscalLifecyclePermissions(page: Page) {
  const consoleResponse = await page.request.get("/api/tenant-admin/console");
  expect(consoleResponse.ok()).toBeTruthy();
  const consoleData = await consoleResponse.json();
  const username = workspacePersona(workspace, "tenant_admin").username;
  const membership = consoleData.membership_management.recent_memberships.find((item: { username: string }) => item.username === username);
  expect(membership).toBeTruthy();
  const suffix = `${test.info().project.name}-${Date.now()}`;
  const roleResponse = await page.request.post("/api/tenant-admin/roles", { data: {
    name: `Phase 4 Fiscal Operator ${suffix}`,
    code: `phase-4-fiscal-${suffix}`,
    description: "Disposable fiscal close and reopen certification role.",
    is_active: true,
    permission_keys: ["finance.periods.close", "finance.periods.reopen"],
  } });
  expect(roleResponse.ok()).toBeTruthy();
  const role = (await roleResponse.json()).role;
  const membershipResponse = await page.request.patch(`/api/tenant-admin/memberships/${membership.id}`, { data: {
    action: "update_roles",
    role_ids: [...membership.role_ids, role.id],
    note: "Phase 4 disposable fiscal lifecycle certification.",
  } });
  expect(membershipResponse.ok()).toBeTruthy();
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

test("financial and leave-year workspaces share compact responsive hierarchy", async ({ page }) => {
  await loginAsTenantAdmin(page);
  const routes = [
    ["/tenant-admin/financial-calendars", "Financial years and periods", "Financial calendar summary"],
    ["/tenant-admin/leave-year", "Leave-year control", "Leave-year governance summary"],
  ] as const;
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    for (const [route, heading, summary] of routes) {
      await page.goto(route);
      await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
      await expect(page.getByRole("group", { name: summary })).toBeVisible();
      await expect(page.getByRole("group", { name: summary }).locator("article")).toHaveCount(4);
      await expectNoOverflow(page);
      const slug = route.split("/").pop()!;
      await page.screenshot({ path: path.join(evidence, `${test.info().project.name}-${slug}-${width}.png`), fullPage: true, animations: "disabled" });
      if (width === 390) await axeScan(page, slug);
    }
  }
});

test("fiscal setup and guarded close reopen persist with audit evidence", async ({ page }) => {
  await loginAsTenantAdmin(page);
  await grantFiscalLifecyclePermissions(page);
  await page.goto("/tenant-admin/financial-calendars");
  const suffix = `${test.info().project.name}-${Date.now()}`;
  const calendarName = `Phase 4 Fiscal ${suffix}`;
  await page.getByLabel("Calendar code").fill(`p4-${suffix}`);
  await page.getByLabel("Calendar name").fill(calendarName);
  await page.getByRole("button", { name: "Save fiscal calendar" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Fiscal calendar saved" })).toBeVisible();

  await page.getByRole("region", { name: "Create financial year" }).locator("select").selectOption({ label: calendarName });
  const yearCode = `FY-${suffix}`;
  await page.getByLabel("Financial year code").fill(yearCode);
  await page.getByLabel("Financial year start").fill("2037-04-01");
  await page.getByLabel("Financial year end").fill("2038-03-31");
  await page.getByRole("button", { name: "Save financial year" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Financial year saved" })).toBeVisible();

  await page.getByRole("region", { name: "Create accounting period" }).locator("select").first().selectOption({ label: yearCode });
  const periodName = `April ${suffix}`;
  await page.getByLabel("Accounting period code").fill(`APR-${suffix}`);
  await page.getByLabel("Accounting period name").fill(periodName);
  await page.getByLabel("Accounting period start").fill("2037-04-01");
  await page.getByLabel("Accounting period end").fill("2037-04-30");
  await page.getByRole("button", { name: "Save accounting period" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Accounting period saved" })).toBeVisible();

  let row = page.getByRole("table", { name: "Accounting periods" }).getByRole("row").filter({ hasText: periodName });
  await row.getByRole("button", { name: "Close" }).click();
  const closeDialog = page.getByRole("dialog", { name: "Close accounting period" });
  await expect(closeDialog.getByLabel("Reason")).toBeFocused();
  await expect(closeDialog.getByRole("button", { name: "Confirm close" })).toBeDisabled();
  await closeDialog.getByLabel("Reason").fill("Authorized Phase 4 accounting close");
  await closeDialog.getByRole("button", { name: "Confirm close" }).click();
  await expect(closeDialog).toHaveCount(0);
  await expect(row).toContainText("closed");
  await expect(row).toContainText("1 event");

  await row.getByRole("button", { name: "Reopen" }).click();
  const reopenDialog = page.getByRole("dialog", { name: "Reopen accounting period" });
  await reopenDialog.getByLabel("Reason").fill("Approved Phase 4 correction window");
  await reopenDialog.getByRole("button", { name: "Confirm reopen" }).click();
  await expect(reopenDialog).toHaveCount(0);
  await expect(row).toContainText("open");
  await expect(row).toContainText("2 events");
  await page.reload();
  row = page.getByRole("table", { name: "Accounting periods" }).getByRole("row").filter({ hasText: periodName });
  await expect(row).toContainText("open");
  await expect(row).toContainText("2 events");
});

test("fiscal uncertain outcomes preserve dialog and form values without replay", async ({ page }) => {
  await loginAsTenantAdmin(page);
  await page.goto("/tenant-admin/financial-calendars");
  const suffix = `${test.info().project.name}-${Date.now()}`;
  await page.getByLabel("Calendar code").fill(`uncertain-${suffix}`);
  await page.getByLabel("Calendar name").fill(`Unconfirmed calendar ${suffix}`);
  await page.route("**/api/tenant-admin/financial-calendars/calendars", (route) => route.abort("connectionreset"), { times: 1 });
  await page.getByRole("button", { name: "Save fiscal calendar" }).click();
  await expect(page.locator(".notice--error[role='alert']")).toContainText("outcome is unconfirmed");
  await expect(page.getByLabel("Calendar code")).toHaveValue(`uncertain-${suffix}`);
  await expect(page.getByRole("button", { name: "Retry" })).toHaveCount(0);

  const openRow = page.getByRole("table", { name: "Accounting periods" }).getByRole("row").filter({ hasText: "open" }).first();
  if (await openRow.count()) {
    await openRow.getByRole("button", { name: "Close" }).click();
    const dialog = page.getByRole("dialog", { name: "Close accounting period" });
    await dialog.getByLabel("Reason").fill("Unconfirmed Phase 4 close attempt");
    await page.route("**/api/tenant-admin/financial-calendars/periods/*/transition", (route) => route.abort("connectionreset"), { times: 1 });
    await dialog.getByRole("button", { name: "Confirm close" }).click();
    await expect(dialog.getByRole("alert")).toContainText("outcome is unconfirmed");
    await expect(dialog.getByLabel("Reason")).toHaveValue("Unconfirmed Phase 4 close attempt");
    await expect(dialog).toBeVisible();
  }
});

test("leave-year preview remains read-only and unauthorized access stays denied", async ({ page }) => {
  await loginAsTenantAdmin(page);
  const suffix = `${test.info().project.name}-${Date.now()}`;
  const create = async (code: string, start: string, end: string) => {
    const response = await page.request.post("/api/tenant-admin/leave-year/periods/", { data: {
      leave_policy_id: workspace.manifest.leave.policy_id,
      legal_entity_id: null,
      code,
      start_date: start,
      end_date: end,
      status: "open",
    } });
    expect(response.status()).toBe(201);
    return response.json();
  };
  const source = await create(`P4-SOURCE-${suffix}`, "2041-01-01", "2041-12-31");
  const target = await create(`P4-TARGET-${suffix}`, "2042-01-01", "2042-12-31");
  await page.goto("/tenant-admin/leave-year");
  await page.getByLabel("Source period", { exact: true }).selectOption(source.id);
  await page.getByLabel("Target period", { exact: true }).selectOption(target.id);
  await page.getByRole("button", { name: "Preview impact" }).click();
  await expect(page.getByText(/balances reviewed/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Confirm year close" })).toBeDisabled();
  const runs = await page.request.get("/api/tenant-admin/leave-year/close-runs/");
  expect(await runs.json()).toEqual([]);

  const employee = workspacePersona(workspace, "employee");
  await login(page, employee.username, employee.password);
  const deniedFinancial = await page.request.get("/api/tenant-admin/financial-calendars");
  const deniedLeave = await page.request.get("/api/tenant-admin/leave-year/periods/");
  expect(deniedFinancial.status()).toBe(403);
  expect(deniedLeave.status()).toBe(403);
  await page.goto("/tenant-admin/leave-year");
  await expect(page).not.toHaveURL(/\/tenant-admin\/leave-year/);
});
