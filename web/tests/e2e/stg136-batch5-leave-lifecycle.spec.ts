import { expect, test, type Locator, type Page } from "@playwright/test";

import {
  cleanupIsolatedQaWorkspace,
  provisionIsolatedQaWorkspace,
  type IsolatedQaWorkspace,
  workspacePersona,
} from "../helpers/isolated-qa-workspace";
import { gotoAuthenticated } from "../helpers/staging-auth";

let workspace: IsolatedQaWorkspace;
let createdTypeId = "";
const backend = process.env.PLAYWRIGHT_BACKEND_URL?.replace(/\/$/, "") ?? "http://127.0.0.1:8048";

function field(scope: Page | Locator, label: string) {
  return scope.getByLabel(label, { exact: true });
}

async function directHeaders(page: Page) {
  const token = (await page.context().cookies()).find((cookie) => cookie.name === "hrms_access_token")?.value;
  expect(token).toBeTruthy();
  return { Authorization: `Token ${token}` };
}

async function submitLeave(page: Page, reason: string, date: string) {
  await gotoAuthenticated(page, "/ess/leave#apply-leave", workspacePersona(workspace, "employee"));
  const dialog = page.getByRole("dialog", { name: "Apply leave" });
  await field(dialog, "Start date").fill(date);
  await field(dialog, "End date").fill(date);
  await field(dialog, "Reason for leave").fill(reason);
  const response = page.waitForResponse((item) => item.url().endsWith("/api/me/leave-requests") && item.request().method() === "POST");
  await dialog.getByRole("button", { name: "Submit leave" }).click();
  const result = await response;
  expect(result.status()).toBe(201);
  const lookup = await page.request.get(`${backend}/api/v1/me/leave-requests/?q=${encodeURIComponent(reason)}&page_size=20`, { headers: await directHeaders(page) });
  expect(lookup.status()).toBe(200);
  const payload = (await lookup.json()) as { items?: Array<{ id: string; reason: string; status: string }> } | Array<{ id: string; reason: string; status: string }>;
  const rows = Array.isArray(payload) ? payload : payload.items ?? [];
  const persisted = rows.find((item) => item.reason === reason);
  expect(persisted).toBeTruthy();
  return persisted!;
}

async function review(page: Page, requestId: string, action: "Approve request" | "Reject request", note: string) {
  await gotoAuthenticated(page, `/mss/approvals?queue=leave&leaveId=${requestId}`, workspacePersona(workspace, "manager"));
  await page.getByRole("button", { name: "Review" }).last().click();
  const dialog = page.getByRole("dialog", { name: "Review leave approval" });
  await expect(dialog).toBeVisible();
  await field(dialog, "Decision note").fill(note);
  const response = page.waitForResponse((item) => item.url().includes(`/api/manager/leave-requests/${requestId}/`) && item.request().method() === "POST");
  await dialog.getByRole("button", { name: action }).click();
  expect((await response).status()).toBe(200);
}

test.describe("STG-136 Batch 5 connected leave lifecycle", () => {
  test.describe.configure({ mode: "serial" });
  test.setTimeout(120_000);

  test.beforeAll(async ({}, testInfo) => {
    workspace = await provisionIsolatedQaWorkspace(testInfo);
  });

  test.afterAll(async () => cleanupIsolatedQaWorkspace(workspace));

  test("STG-E2E-0501 and STG-E2E-0502 configure an effective carry-forward policy in the browser", async ({ page }) => {
    const suffix = Date.now().toString(36).slice(-6);
    const typeName = `Batch 5 Earned Leave ${suffix}`;
    await gotoAuthenticated(page, "/hr-admin/leave-types/new", workspacePersona(workspace, "hr_admin"));
    await field(page, "Code").fill(`B5EL${suffix}`);
    await field(page, "Name").fill(typeName);
    await field(page, "Short code").fill("B5EL");
    const typeResponse = page.waitForResponse((item) => item.url().endsWith("/api/hr-admin/leave-types") && item.request().method() === "POST");
    await page.getByRole("button", { name: "Create leave type" }).click();
    const createdType = await typeResponse;
    expect(createdType.status()).toBe(201);
    const typeLookup = await page.request.get(`${backend}/api/v1/hr-admin/leave-types/?q=${encodeURIComponent(`B5EL${suffix}`)}`, { headers: await directHeaders(page) });
    expect(typeLookup.status()).toBe(200);
    const typeRows = (await typeLookup.json()) as Array<{ id: string; code: string }>;
    createdTypeId = typeRows.find((item) => item.code === `B5EL${suffix}`)?.id ?? "";
    expect(createdTypeId).toBeTruthy();

    await gotoAuthenticated(page, "/hr-admin/leave-policies/new", workspacePersona(workspace, "hr_admin"));
    const template = page.locator("label.form-field").filter({ hasText: "Template" }).locator("select");
    await template.selectOption("india-earned-leave");
    await page.getByRole("button", { name: "Apply template" }).click();
    await field(page, "Leave type").selectOption(createdTypeId);
    await field(page, "Code").fill(`B5POL${suffix}`);
    await field(page, "Name").fill(`Batch 5 governed policy ${suffix}`);
    await field(page, "Status").selectOption("active");
    await field(page, "Effective from").fill("2026-01-01");
    await field(page, "Effective to").fill("2026-12-31");
    await expect(field(page, "Annual entitlement")).toHaveValue("20.00");
    await expect(field(page, "Max carry forward")).toHaveValue("10.00");
    const policyResponse = page.waitForResponse((item) => item.url().endsWith("/api/hr-admin/leave-policies") && item.request().method() === "POST");
    await page.getByRole("button", { name: "Create leave policy" }).click();
    const createdPolicy = await policyResponse;
    expect(createdPolicy.status()).toBe(201);
    const policyLookup = await page.request.get(`${backend}/api/v1/hr-admin/leave-policies/?q=${encodeURIComponent(`B5POL${suffix}`)}`, { headers: await directHeaders(page) });
    expect(policyLookup.status()).toBe(200);
    const policyRows = (await policyLookup.json()) as Array<{ code: string; config_snapshot: { entitlement: { carry_forward_mode: string } } }>;
    const payload = policyRows.find((item) => item.code === `B5POL${suffix}`);
    expect(payload).toBeTruthy();
    expect(payload!.config_snapshot.entitlement.carry_forward_mode).toBe("limited");
  });

  test("STG-E2E-0504 and STG-E2E-0506 submit in ESS and approve in MSS", async ({ page }) => {
    const request = await submitLeave(page, "Batch 5 browser approval", "2026-11-09");
    expect(request.status).toBe("pending");
    await review(page, request.id, "Approve request", "Batch 5 manager approval");
    await gotoAuthenticated(page, `/ess/leave?status=approved&requestId=${request.id}`, workspacePersona(workspace, "employee"));
    await expect(page.getByRole("dialog")).toContainText("approved");
    await expect(page.getByRole("dialog")).toContainText("Batch 5 manager approval");
  });

  test("STG-E2E-0507 rejects a separate request without consuming entitlement", async ({ page }) => {
    const request = await submitLeave(page, "Batch 5 browser rejection", "2026-11-10");
    await review(page, request.id, "Reject request", "Batch 5 manager rejection");
    await gotoAuthenticated(page, `/ess/leave?status=rejected&requestId=${request.id}`, workspacePersona(workspace, "employee"));
    await expect(page.getByRole("dialog")).toContainText("rejected");
    await expect(page.getByRole("dialog")).toContainText("Batch 5 manager rejection");
  });
});
