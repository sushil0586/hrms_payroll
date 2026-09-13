import { expect, test, type APIResponse, type Page } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { employee, gotoAuthenticated, hrAdmin, manager, platformAdmin, type Persona } from "../helpers/staging-auth";

type PayrollOutputArtifact = {
  id: string;
  kind: string;
  status: string;
  employee_code: string | null;
  checksum_sha256: string;
  is_downloadable: boolean;
  supports_signed_url: boolean;
};

type PayrollOutputSetup = {
  output_batches: Array<{
    id: string;
    payroll_run_name: string;
    status: string;
    payslip_count: number;
    register_count: number;
    published_artifact_count: number;
  }>;
  artifacts: PayrollOutputArtifact[];
};

type EssPayslipList = {
  items: Array<{
    id: string;
    employee_code?: string;
    payroll_run_name: string;
    source_hash: string;
  }>;
};

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

const prefix = process.env.PLAYWRIGHT_PILOT100_PREFIX ?? "PILOT100_20260912";
const runName = `${prefix} Output Payslip ESS Gate`;
const pilotEmployee: Persona = {
  username: process.env.PLAYWRIGHT_PILOT100_EMPLOYEE_USERNAME ?? `${prefix.toLowerCase()}.e001`,
  password: process.env.PLAYWRIGHT_LIVE_SEED_PASSWORD ?? "Password@123",
};
const pilotManager: Persona = {
  username: process.env.PLAYWRIGHT_PILOT100_MANAGER_USERNAME ?? `${prefix.toLowerCase()}.e001`,
  password: process.env.PLAYWRIGHT_LIVE_SEED_PASSWORD ?? "Password@123",
};

async function loginAs(page: Page, persona: Persona, path: string) {
  await page.request.post("/api/auth/logout").catch(() => null);
  await page.context().clearCookies();
  await gotoAuthenticated(page, path, persona);
}

async function authToken(page: Page) {
  const token = (await page.context().cookies()).find((cookie) => cookie.name === "hrms_access_token")?.value;
  expect(token, "Expected authenticated browser session token.").toBeTruthy();
  return token!;
}

async function backendApiGet<T>(page: Page, path: string) {
  const apiBase = process.env.HRMS_API_BASE_URL ?? "http://127.0.0.1:8012/api/v1";
  const response = await page.request.get(`${apiBase}${path}`, {
    headers: { Authorization: `Token ${await authToken(page)}` },
  });
  expect(response.status(), `${path} should return 200 from backend API`).toBe(200);
  return (await response.json()) as T;
}

async function backendSession(page: Page) {
  return backendApiGet<SessionPayload>(page, "/auth/session/");
}

async function expectDenied(response: APIResponse, label: string) {
  expect([401, 403, 404, 405], `${label} should fail closed`).toContain(response.status());
  const payload = await response.json().catch(async () => ({ text: await response.text().catch(() => "") }));
  const serialized = JSON.stringify(payload).toLowerCase();
  for (const secret of ["password", "secret", "token", "salary_snapshot", "tenant.bank.debit_account", "payroll.provider.bank.live"]) {
    expect(serialized, `${label} should not leak ${secret}`).not.toContain(secret);
  }
}

async function locateP100Artifacts(page: Page) {
  await loginAs(page, hrAdmin, "/hr-admin/payroll-outputs");
  await expectPageReady(page, "Payroll Outputs");
  const setup = await backendApiGet<PayrollOutputSetup>(page, "/hr-admin/payroll-output-setup/");
  const batch = setup.output_batches.find((item) => item.payroll_run_name === runName);
  expect(batch, `Expected published P100 output batch for ${runName}`).toBeTruthy();
  expect(batch?.status).toBe("published");
  expect(batch?.payslip_count).toBe(100);
  expect(batch?.register_count).toBe(1);
  expect(batch?.published_artifact_count).toBeGreaterThanOrEqual(101);

  const artifacts = setup.artifacts.filter((item) => item.output_batch_id === batch?.id && item.status === "published");
  const register = artifacts.find((item) => item.kind === "register");
  const pilotPayslip = artifacts.find((item) => item.kind === "payslip" && item.employee_code === `${prefix}_E001`);
  const otherPayslip = artifacts.find((item) => item.kind === "payslip" && item.employee_code === `${prefix}_E002`);
  expect(register, "Expected P100 register artifact").toBeTruthy();
  expect(pilotPayslip, "Expected pilot employee payslip artifact").toBeTruthy();
  expect(otherPayslip, "Expected another employee payslip artifact").toBeTruthy();
  return { register: register!, pilotPayslip: pilotPayslip!, otherPayslip: otherPayslip! };
}

test.describe.serial("P100-11 security and isolation certification", () => {
  test("public, stale, and cross-role workspace access fail closed", async ({ page }) => {
    test.setTimeout(4 * 60 * 1000);

    await page.context().clearCookies();
    for (const path of ["/hr-admin", "/tenant-admin", "/platform-admin", "/ess", "/mss/approvals", "/support"]) {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      await expect(page).toHaveURL(/\/login$/);
      await expect(page.getByText(/could not load the current workspace|live workspace load failed/i)).toHaveCount(0);
    }

    const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? "https://hrms.accerio.in";
    await page.context().addCookies([
      {
        name: "hrms_access_token",
        value: "p100-stale-invalid-token",
        domain: new URL(baseUrl).hostname,
        path: "/",
        httpOnly: true,
        secure: baseUrl.startsWith("https://"),
        sameSite: "Lax",
      },
    ]);
    await page.goto("/hr-admin", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/login$/);

    await loginAs(page, pilotEmployee, "/hr-admin");
    await expectPageReady(page, "Choose your workspace");
    await expect(page.getByText("HR admin restricted")).toBeVisible();

    await loginAs(page, pilotManager, "/platform-admin");
    await expectPageReady(page, "Choose your workspace");
    await expect(page.getByText("Platform admin restricted")).toBeVisible();

    await loginAs(page, hrAdmin, "/platform-admin");
    await expectPageReady(page, "Choose your workspace");
    await expect(page.getByText("Platform admin restricted")).toBeVisible();

    await loginAs(page, platformAdmin, "/hr-admin");
    await expectPageReady(page, "Choose your workspace");
    await expect(page.getByText("HR admin restricted")).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("direct privileged APIs deny wrong roles without leaking payroll or provider data", async ({ page }) => {
    test.setTimeout(5 * 60 * 1000);

    const privilegedGetRoutes = [
      "/api/hr-admin/employees",
      "/api/hr-admin/payroll-output-setup",
      "/api/hr-admin/payroll-finance-handoff-setup",
      "/api/hr-admin/reports/payroll-register?sort=net_pay_desc",
      "/api/hr-admin/reports/export-audits",
      "/api/hr-admin/reports/tds-efile-package",
      "/api/tenant-admin/trust-audit",
      "/api/support/tenant-console?tenant_code=northstar-foods&scope_ref=payroll_support",
    ];

    await loginAs(page, pilotEmployee, "/ess");
    await expectPageReady(page, "Self service");
    for (const route of privilegedGetRoutes) {
      await expectDenied(await page.request.get(route), `employee GET ${route}`);
    }

    await loginAs(page, pilotManager, "/mss/approvals");
    await expectPageReady(page, "Manager inbox");
    for (const route of privilegedGetRoutes.filter((item) => item.startsWith("/api/hr-admin"))) {
      await expectDenied(await page.request.get(route), `manager GET ${route}`);
    }

    await page.request.post("/api/auth/logout").catch(() => null);
    await page.context().clearCookies();
    await expectDenied(
      await page.request.post("/api/hr-admin/notifications/bulk-retry", {
        data: { notification_ids: ["00000000-0000-0000-0000-000000000000"], process_now: true },
      }),
      "anonymous notification retry",
    );
  });

  test("pilot payroll artifacts and ESS payslips stay scoped to the signed-in user", async ({ page }) => {
    test.setTimeout(5 * 60 * 1000);

    const artifacts = await locateP100Artifacts(page);
    const registerDownload = `/api/hr-admin/payroll-output-artifacts/${artifacts.register.id}/download`;
    const ownHrPayslipDownload = `/api/hr-admin/payroll-output-artifacts/${artifacts.pilotPayslip.id}/download`;
    const otherEssPayslipDownload = `/api/me/payroll-payslips/${artifacts.otherPayslip.id}/download`;

    const hrRegisterResponse = await page.request.get(registerDownload);
    expect(hrRegisterResponse.status()).toBe(200);
    expect(hrRegisterResponse.headers()["x-payroll-artifact-checksum"]).toBeTruthy();

    const hrPayslipResponse = await page.request.get(ownHrPayslipDownload);
    expect(hrPayslipResponse.status()).toBe(200);
    expect(hrPayslipResponse.headers()["x-payroll-artifact-checksum"]).toBe(artifacts.pilotPayslip.checksum_sha256);

    await loginAs(page, pilotEmployee, "/ess/payslips");
    await expectPageReady(page, "Payslips");
    await expect(page.getByText(`${prefix}_E001`).first()).toBeVisible();
    await expectDenied(await page.request.get(registerDownload), "employee HR register download");
    await expectDenied(await page.request.get(ownHrPayslipDownload), "employee HR payslip proxy download");
    await expectDenied(await page.request.get(otherEssPayslipDownload), "employee other payslip ESS download");

    const ownPayslips = await backendApiGet<EssPayslipList>(page, `/me/payroll-payslips/?q=${encodeURIComponent(prefix.toLowerCase())}`);
    expect(ownPayslips.items.length).toBeGreaterThanOrEqual(1);
    expect(ownPayslips.items.every((item) => item.id === artifacts.pilotPayslip.id)).toBeTruthy();

    const ownEssDownload = await page.request.get(`/api/me/payroll-payslips/${artifacts.pilotPayslip.id}/download`);
    expect(ownEssDownload.status()).toBe(200);
    expect(ownEssDownload.headers()["x-payroll-artifact-checksum"]).toBe(artifacts.pilotPayslip.checksum_sha256);
    await expectNoHorizontalOverflow(page);
  });

  test("session API confirms personas remain in one tenant and expose only expected workspaces", async ({ page }) => {
    test.setTimeout(3 * 60 * 1000);

    const personas: Array<{ persona: Persona; path: string; expectedWorkspace: string; forbiddenWorkspace: string }> = [
      { persona: hrAdmin, path: "/hr-admin", expectedWorkspace: "hr_admin", forbiddenWorkspace: "platform_admin" },
      { persona: pilotEmployee, path: "/ess", expectedWorkspace: "ess", forbiddenWorkspace: "hr_admin" },
      { persona: pilotManager, path: "/mss/approvals", expectedWorkspace: "mss", forbiddenWorkspace: "platform_admin" },
    ];

    const tenantCodes = new Set<string>();
    for (const item of personas) {
      await loginAs(page, item.persona, item.path);
      const payload = await backendSession(page);
      const user = payload.user ?? payload;
      expect(user.workspace_access?.[item.expectedWorkspace]).toBeTruthy();
      expect(user.workspace_access?.[item.forbiddenWorkspace]).toBeFalsy();
      const tenantCode = user.default_membership?.tenant_code;
      expect(tenantCode).toBeTruthy();
      tenantCodes.add(tenantCode ?? "");
    }
    expect(tenantCodes.size, "P100 personas should stay in one tenant context during pilot security run").toBe(1);
  });
});
