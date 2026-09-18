import { expect, type APIResponse, type Page, test } from "@playwright/test";

import { expectNoAppError, expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated, supportAgent, tenantAdmin } from "../helpers/staging-auth";

type TenantConsole = {
  tenant: {
    code: string;
    name: string;
  };
};

function uniqueRunRef() {
  return new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14).toLowerCase();
}

function apiBaseUrl() {
  return process.env.HRMS_API_BASE_URL ?? "http://127.0.0.1:8012/api/v1";
}

async function authHeaders(page: Page) {
  const token = (await page.context().cookies()).find((cookie) => cookie.name === "hrms_access_token")?.value;
  expect(token).toBeTruthy();
  return { Authorization: `Token ${token}` };
}

async function safeWait(page: Page) {
  await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
}

async function expectDenied(response: APIResponse, label: string) {
  expect([401, 403, 404, 405], label).toContain(response.status());
  const body = await response.json().catch(() => ({}));
  const text = JSON.stringify(body).toLowerCase();
  expect(text).not.toContain("generated_password");
  expect(text).not.toContain("password@123");
  expect(text).not.toContain("token");
  expect(text).not.toContain("secret");
}

async function tenantConsole(page: Page) {
  const response = await page.request.get(`${apiBaseUrl()}/tenant-admin/console/`, {
    headers: await authHeaders(page),
  });
  expect(response.ok(), await response.text()).toBeTruthy();
  return (await response.json()) as TenantConsole;
}

async function gotoTenant(page: Page, path: string, heading: string | RegExp) {
  await gotoAuthenticated(page, path, tenantAdmin);
  await safeWait(page);
  await expectPageReady(page, heading);
}

async function loginViaApi(page: Page, persona: { username: string; password: string }) {
  await page.request.post("/api/auth/logout").catch(() => null);
  await page.context().clearCookies();
  const response = await page.request.post("/api/auth/login", {
    data: {
      identifier: persona.username,
      password: persona.password,
    },
  });
  expect(response.ok()).toBeTruthy();
}

test.describe("Tenant Admin final production-readiness certification", () => {
  test("certifies the integrated tenant-owner journey across users, roles, plan, support, security, trust, and RBAC", async ({ page }, testInfo) => {
    test.setTimeout(600_000);

    const runRef = uniqueRunRef();
    const qaEmail = `ta.final.${runRef}@example.test`;
    const qaUsername = `ta.final.${runRef}`;
    const qaRoleName = `TA Final Evidence ${runRef}`;
    const qaRoleCode = `ta-final-evidence-${runRef}`;
    const qaRequestTitle = `TA final config request ${runRef}`;
    const qaSupportReason = `TA final support evidence ${runRef}`;
    const consoleErrors: string[] = [];
    const failedRequests: string[] = [];

    page.on("console", (message) => {
      if (message.type() === "error" && !/favicon|Failed to load resource/i.test(message.text())) {
        consoleErrors.push(message.text());
      }
    });
    page.on("pageerror", (error) => consoleErrors.push(error.message));
    page.on("requestfailed", (request) => {
      const failure = request.failure()?.errorText ?? "";
      if (!request.url().includes("_rsc") && !failure.includes("ERR_ABORTED")) {
        failedRequests.push(`${request.method()} ${request.url()} ${failure}`);
      }
    });

    await gotoTenant(page, "/tenant-admin", "Tenant Admin Console");
    const initialConsole = await tenantConsole(page);
    await expect(page.getByTestId("tenant-admin-control-center")).toBeVisible();
    await expect(page.getByTestId("tenant-setup-guide")).toContainText(/of \d+ visible launch steps complete/);
    for (const link of ["Manage users", "Review plan", "Open support", "Review audit", "Review blockers"]) {
      await expect(page.getByTestId("tenant-admin-control-center").getByRole("link", { name: link })).toBeVisible();
    }
    await testInfo.attach("tenant-admin-final-01-dashboard", {
      body: await page.screenshot({ fullPage: true }),
      contentType: "image/png",
    });

    await gotoTenant(page, "/tenant-admin/users", "Tenant User Management");
    await page.getByRole("main").getByRole("button", { name: "Invite member" }).click();
    const inviteDialog = page.getByRole("dialog", { name: "Invite tenant member" });
    await expect(inviteDialog).toBeVisible();
    await inviteDialog.getByLabel("Email").fill(qaEmail);
    await inviteDialog.getByLabel("Username").fill(qaUsername);
    await inviteDialog.getByLabel("First name").fill("TA");
    await inviteDialog.getByLabel("Last name").fill("Final");
    await inviteDialog.getByLabel("Status").selectOption("invited");
    const inviteResponse = page.waitForResponse((response) => response.url().includes("/api/tenant-admin/memberships") && response.request().method() === "POST");
    await inviteDialog.getByRole("button", { name: "Invite member", exact: true }).click();
    await expect((await inviteResponse).ok()).toBeTruthy();
    const memberRow = page.locator(".tenant-membership-row").filter({ hasText: qaEmail }).first();
    await expect(memberRow).toBeVisible({ timeout: 20_000 });
    await expect(memberRow.getByText("Invited")).toBeVisible();
    await page.reload({ waitUntil: "domcontentloaded" });
    await safeWait(page);
    await page.getByRole("main").getByLabel("Search members").fill(qaEmail);
    await expect(page.locator(".tenant-membership-row")).toHaveCount(1);
    await expect(page.locator(".tenant-membership-row").first()).toContainText(qaEmail);
    await page.locator(".tenant-membership-row").first().getByRole("button", { name: "Revoke" }).click();
    const revokeDialog = page.getByRole("dialog", { name: "Revoke tenant member" });
    await revokeDialog.getByLabel("Change note").fill("Revoke disposable final certification member.");
    const revokeResponse = page.waitForResponse((response) => response.url().includes("/api/tenant-admin/memberships/") && response.request().method() === "PATCH");
    await revokeDialog.getByRole("button", { name: "Revoke", exact: true }).click();
    await expect((await revokeResponse).ok()).toBeTruthy();
    await expect(page.locator(".tenant-membership-row").first()).toContainText("Revoked", { timeout: 20_000 });

    await gotoTenant(page, "/tenant-admin/roles", "Roles & Permissions");
    await page.getByRole("main").getByRole("button", { name: "Add role" }).click();
    const roleDialog = page.getByRole("dialog", { name: "Create tenant role" });
    await expect(roleDialog.getByLabel("Role name")).toBeFocused();
    await roleDialog.getByLabel("Role name").fill(qaRoleName);
    await roleDialog.getByLabel("Role code").fill(qaRoleCode);
    await roleDialog.getByLabel("Description").fill("Final certification role proving tenant-configured permissions.");
    await roleDialog.getByRole("tab", { name: "Tenant Admin" }).click();
    await roleDialog.getByRole("checkbox", { name: /^View tenant control center\b/ }).check();
    await expect(roleDialog.locator(".tenant-permission-summary")).toContainText("1 selected");
    const roleCreateResponse = page.waitForResponse((response) => response.url().includes("/api/tenant-admin/roles") && response.request().method() === "POST");
    await roleDialog.getByRole("button", { name: "Create role" }).click();
    await expect((await roleCreateResponse).ok()).toBeTruthy();
    await expect(page.getByText("Role created.")).toBeVisible();
    await page.getByLabel("Search roles").fill(qaRoleCode);
    await expect(page.locator(".tenant-role-row")).toHaveCount(1);
    await expect(page.locator(".tenant-role-row")).toContainText(qaRoleName);

    await gotoTenant(page, "/tenant-admin/settings", "Tenant Settings");
    await expect(page.getByText("Tenant identifiers are platform-governed.")).toBeVisible();
    await page.getByRole("main").getByRole("link", { name: "Request account change" }).click();
    await expectPageReady(page, "Plans And Subscription");
    await expect(page.getByRole("main").getByLabel("Type")).toHaveValue("configuration_change");
    await expect(page.getByRole("main").getByLabel("Target ref")).toHaveValue("tenant.account.profile");
    await page.getByRole("main").getByLabel("Title").fill(qaRequestTitle);
    await page.getByRole("main").getByLabel("Description").fill("Disposable final certification account change request.");
    await page.getByRole("main").getByLabel("Payload").fill("{\n  \"configuration_key\": \"tenant.account.profile\",\n  \"change_summary\": \"Final certification request\"\n}");
    const changeCreateResponse = page.waitForResponse((response) => response.url().includes("/api/tenant-admin/change-requests") && response.request().method() === "POST");
    await page.getByRole("main").getByRole("button", { name: "Submit request" }).click();
    await expect((await changeCreateResponse).ok()).toBeTruthy();
    const requestRow = page.locator(".tenant-change-request-row").filter({ hasText: qaRequestTitle }).first();
    await expect(requestRow).toBeVisible({ timeout: 20_000 });
    await expect(requestRow).toContainText("Submitted");
    await requestRow.getByRole("button", { name: "Cancel" }).click();
    const cancelResponse = page.waitForResponse((response) => response.url().includes("/api/tenant-admin/change-requests/") && response.request().method() === "PATCH");
    await expect((await cancelResponse).ok()).toBeTruthy();
    await expect(requestRow).toContainText("Canceled", { timeout: 20_000 });

    await gotoTenant(page, "/tenant-admin/support-access", "Support Access");
    const supportForm = page.getByTestId("tenant-support-access-form");
    await supportForm.getByLabel("Support agent").fill(`support.final.${runRef}`);
    await supportForm.getByLabel("Reason").fill(qaSupportReason);
    const supportCreateResponse = page.waitForResponse((response) => response.url().includes("/api/tenant-admin/support-access-grants") && response.request().method() === "POST");
    await supportForm.getByRole("button", { name: "Request access" }).click();
    await expect((await supportCreateResponse).ok()).toBeTruthy();
    const supportRow = page.locator(".tenant-support-access-row").filter({ hasText: qaSupportReason }).first();
    await expect(supportRow).toBeVisible({ timeout: 20_000 });
    await expect(supportRow).toContainText("Requested");
    await expect(supportRow.getByRole("button", { name: "Approve" })).toBeDisabled();
    await supportRow.getByLabel("Decision note").fill("Approve final integrated support access proof.");
    await expect(supportRow.getByRole("button", { name: "Approve" })).toBeEnabled();
    const approveResponse = page.waitForResponse((response) => response.url().includes("/api/tenant-admin/support-access-grants/") && response.request().method() === "PATCH");
    await supportRow.getByRole("button", { name: "Approve" }).click();
    await expect((await approveResponse).ok()).toBeTruthy();
    await expect(supportRow).toContainText("Approved", { timeout: 20_000 });
    await supportRow.getByLabel("Decision note").fill("Revoke final integrated support access proof.");
    const revokeSupportResponse = page.waitForResponse((response) => response.url().includes("/api/tenant-admin/support-access-grants/") && response.request().method() === "PATCH");
    await supportRow.getByRole("button", { name: "Revoke" }).click();
    await expect((await revokeSupportResponse).ok()).toBeTruthy();
    await expect(supportRow).toContainText("Revoked", { timeout: 20_000 });

    await gotoTenant(page, "/tenant-admin/security-readiness", "Enterprise Security Readiness");
    for (const heading of ["MFA and SSO", "SCIM and Sessions", "Audit and Data Protection"]) {
      await expect(page.getByRole("heading", { name: heading })).toBeVisible();
    }
    await expect(page.getByText(/Evidence:/).first()).toBeVisible();
    await expect(page.getByText(/Owner:/).first()).toBeVisible();

    await gotoTenant(page, "/tenant-admin/trust-audit?event_group=tenant_admin&page_size=5", "Tenant Trust Audit");
    await expect(page.getByText("Group: Tenant Admin")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Evidence ledger" })).toBeVisible();
    const auditDownload = await page.request.get("/api/tenant-admin/commercial-support-audit/download");
    expect(auditDownload.ok()).toBeTruthy();
    const auditBody = await auditDownload.json();
    expect(auditBody.tenant.code).toBe(initialConsole.tenant.code);
    expect(auditBody.evidence_checksum_sha256).toMatch(/^[a-f0-9]{64}$/);

    await loginViaApi(page, supportAgent);
    await expectDenied(await page.request.get("/api/tenant-admin/trust-audit"), "support agent trust audit denial");
    await expectDenied(
      await page.request.post("/api/tenant-admin/memberships", {
        data: {
          username: `blocked.${runRef}`,
          email: `blocked.${runRef}@example.test`,
          role_ids: [],
        },
      }),
      "support agent membership mutation denial"
    );

    await testInfo.attach("tenant-admin-final-02-trust-audit", {
      body: await page.screenshot({ fullPage: true }),
      contentType: "image/png",
    });
    expect(consoleErrors, "Browser console/page errors").toEqual([]);
    expect(failedRequests, "Failed browser requests").toEqual([]);
    await expectNoAppError(page);
    await expectNoHorizontalOverflow(page);
  });
});
