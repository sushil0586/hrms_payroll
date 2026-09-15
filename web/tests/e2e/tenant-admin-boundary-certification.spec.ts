import { expect, type APIResponse, type Page, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { employee, gotoAuthenticated, manager, platformAdmin, supportAgent, tenantAdmin, type Persona } from "../helpers/staging-auth";

type SessionPayload = {
  username?: string;
  workspace_access?: Record<string, boolean>;
  default_membership?: {
    tenant_code?: string;
    role_codes?: string[];
  } | null;
  user?: {
    username?: string;
    workspace_access?: Record<string, boolean>;
    default_membership?: {
      tenant_code?: string;
      role_codes?: string[];
    } | null;
  };
};

const tenantAdminPages = [
  { path: "/tenant-admin", heading: "Tenant Admin Console" },
  { path: "/tenant-admin/users", heading: "Tenant User Management" },
  { path: "/tenant-admin/plan", heading: "Plans And Subscription" },
  { path: "/tenant-admin/setup", heading: "Tenant Setup Guide" },
  { path: "/tenant-admin/support-access", heading: "Support Access" },
  { path: "/tenant-admin/trust-audit", heading: "Tenant Trust Audit" },
  { path: "/tenant-admin/settings", heading: "Tenant Settings" },
  { path: "/tenant-admin/security-readiness", heading: "Enterprise Security Readiness" },
] as const;

function uniqueRef(label: string) {
  return `ta-boundary-${label}-${Date.now()}`;
}

async function sessionFor(page: Page) {
  const apiBase = process.env.HRMS_API_BASE_URL ?? "http://127.0.0.1:8012/api/v1";
  const token = (await page.context().cookies()).find((cookie) => cookie.name === "hrms_access_token")?.value;
  expect(token, "Expected browser auth token").toBeTruthy();
  const response = await page.request.get(`${apiBase}/auth/session/`, {
    headers: { Authorization: `Token ${token}` },
  });
  expect(response.ok()).toBeTruthy();
  const payload = (await response.json()) as SessionPayload;
  return payload.user ?? payload;
}

async function expectDenied(response: APIResponse, label: string) {
  expect([401, 403, 404, 405], `${label} should fail closed`).toContain(response.status());
  const payload = await response.json().catch(async () => ({ text: await response.text().catch(() => "") }));
  const serialized = JSON.stringify(payload).toLowerCase();
  for (const restrictedTerm of ["password", "secret", "salary_snapshot", "tenant.bank.debit_account", "payroll.provider.bank.live"]) {
    expect(serialized, `${label} should not leak ${restrictedTerm}`).not.toContain(restrictedTerm);
  }
}

async function expectTenantAdminApisDenied(page: Page, label: string) {
  await expectDenied(await page.request.get("/api/tenant-admin/security-readiness"), `${label} security readiness`);
  await expectDenied(await page.request.get("/api/tenant-admin/trust-audit"), `${label} trust audit`);
  await expectDenied(await page.request.get("/api/tenant-admin/commercial-support-audit/download"), `${label} audit download`);

  await expectDenied(
    await page.request.post("/api/tenant-admin/memberships", {
      data: {
        username: uniqueRef(`${label}-member`),
        email: `${uniqueRef(`${label}-member`)}@example.test`,
        membership_status: "invited",
        role_ids: ["00000000-0000-4000-8000-000000000000"],
      },
    }),
    `${label} membership create`,
  );
  await expectDenied(
    await page.request.patch("/api/tenant-admin/memberships/00000000-0000-4000-8000-000000000000", {
      data: { action: "suspend", note: "Boundary verification." },
    }),
    `${label} membership patch`,
  );
  await expectDenied(
    await page.request.post("/api/tenant-admin/change-requests", {
      data: {
        request_type: "plan_change",
        title: "Unauthorized tenant plan change",
        target_ref: "subscription.plan.enterprise",
        description: "Boundary verification.",
        payload: { subscription_plan: "enterprise" },
      },
    }),
    `${label} change request create`,
  );
  await expectDenied(
    await page.request.patch("/api/tenant-admin/change-requests/00000000-0000-4000-8000-000000000000", {
      data: { action: "approve", decision_note: "Boundary verification." },
    }),
    `${label} change request patch`,
  );
  await expectDenied(
    await page.request.post("/api/tenant-admin/support-access-grants", {
      data: {
        support_agent_identifier: "support.agent",
        reason: "Unauthorized support grant.",
        scope_refs: ["account_posture"],
        requested_duration_minutes: 15,
      },
    }),
    `${label} support access create`,
  );
  await expectDenied(
    await page.request.patch("/api/tenant-admin/support-access-grants/00000000-0000-4000-8000-000000000000", {
      data: { action: "approve", decision_note: "Boundary verification." },
    }),
    `${label} support access patch`,
  );
}

test.describe("Tenant admin cross-role and cross-tenant boundaries", () => {
  test("redirects unauthenticated tenant-admin pages to login without workspace failure noise", async ({ page }) => {
    await page.context().clearCookies();
    for (const tenantPage of tenantAdminPages) {
      await page.goto(tenantPage.path, { waitUntil: "domcontentloaded" });
      await expect(page).toHaveURL(/\/login$/);
      await expect(page.getByText(/could not load the current workspace|live workspace load failed/i)).toHaveCount(0);
    }
  });

  test("keeps tenant-admin pages unavailable to employee, manager, platform admin, and support agent roles", async ({ page }) => {
    const blockedPersonas: Array<{ label: string; persona: Persona }> = [
      { label: "employee", persona: employee },
      { label: "manager", persona: manager },
      { label: "platform admin", persona: platformAdmin },
      { label: "support agent", persona: supportAgent },
    ];

    for (const { label, persona } of blockedPersonas) {
      await gotoAuthenticated(page, tenantAdminPages[0].path, persona);
      const session = await sessionFor(page);
      if (session.workspace_access?.tenant_admin) {
        await expectPageReady(page, "Tenant Admin Console");
      } else {
        await expect(page).not.toHaveURL(/\/tenant-admin$/);
        await expect(page.getByRole("main").getByText("Tenant Admin Console", { exact: true })).toHaveCount(0);
        const tenantShortcut = page.getByRole("region", { name: "Workspace shortcuts" }).getByRole("link", { name: "Tenant" });
        if (await tenantShortcut.isVisible().catch(() => false)) {
          await expect(tenantShortcut).toHaveAttribute("href", "/");
        } else {
          await expect(page.getByText("Tenant admin restricted").first()).toBeVisible();
        }
      }
      await expectTenantAdminApisDenied(page, label);
    }
    await expectNoHorizontalOverflow(page);
  });

  test("allows tenant admin to read only the active tenant trust and security surfaces", async ({ page }) => {
    await gotoAuthenticated(page, "/tenant-admin", tenantAdmin);
    await expectPageReady(page, "Tenant Admin Console");
    const session = await sessionFor(page);
    const tenantCode = session.default_membership?.tenant_code;
    expect(tenantCode, "Expected tenant admin session to include a tenant code").toBeTruthy();
    expect(session.workspace_access?.tenant_admin).toBeTruthy();

    for (const tenantPage of tenantAdminPages) {
      await page.goto(tenantPage.path, { waitUntil: "domcontentloaded" });
      await expectPageReady(page, tenantPage.heading);
      await expect(page.getByRole("main").getByText(tenantCode!, { exact: true }).first()).toBeVisible();
      await expectNoHorizontalOverflow(page);
    }

    const security = await page.request.get("/api/tenant-admin/security-readiness");
    expect(security.status()).toBe(200);
    const securityPayload = await security.json();
    expect(securityPayload.tenant.code).toBe(tenantCode);

    const audit = await page.request.get("/api/tenant-admin/trust-audit?page_size=5");
    expect(audit.status()).toBe(200);
    const auditPayload = await audit.json();
    expect(auditPayload.tenant.code).toBe(tenantCode);
    expect(auditPayload.events.length).toBeLessThanOrEqual(5);

    const download = await page.request.get("/api/tenant-admin/commercial-support-audit/download");
    expect(download.status()).toBe(200);
    expect(download.headers()["content-type"]).toContain("application/json");
    const downloadPayload = await download.json();
    expect(downloadPayload.tenant.code).toBe(tenantCode);
    expect(downloadPayload.evidence_checksum_sha256).toBeTruthy();
  });
});
