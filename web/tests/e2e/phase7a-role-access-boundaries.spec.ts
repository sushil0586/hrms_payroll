import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";

import { expect, type APIResponse, type Page, test, type TestInfo } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { employee, hrAdmin, manager, platformAdmin, type Persona } from "../helpers/staging-auth";

type SessionUser = {
  workspace_access: {
    ess?: boolean;
    mss?: boolean;
    hr_admin?: boolean;
    tenant_admin?: boolean;
    platform_admin?: boolean;
  };
  default_membership?: {
    role_codes?: string[];
  } | null;
};

async function captureSecurityStep(page: Page, testInfo: TestInfo, name: string) {
  const path = testInfo.outputPath(`phase7a-role-access-boundaries/${name}.png`);
  await mkdir(dirname(path), { recursive: true });
  await page.screenshot({ path, fullPage: true });
}

async function switchPersona(page: Page, persona: Persona, path: string) {
  await page.request.post("/api/auth/logout").catch(() => null);
  await page.context().clearCookies();
  const response = await page.request.post("/api/auth/login", {
    data: {
      identifier: persona.username,
      password: persona.password,
    },
  });
  expect(response.ok()).toBeTruthy();
  await page.goto(path, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
}

async function sessionUser(page: Page) {
  const apiBase = process.env.HRMS_API_BASE_URL ?? "http://127.0.0.1:8012/api/v1";
  const cookies = await page.context().cookies();
  const token = cookies.find((cookie) => cookie.name === "hrms_access_token")?.value;
  expect(token).toBeTruthy();
  const response = await page.request.get(`${apiBase}/auth/session/`, {
    headers: { Authorization: `Token ${token}` },
  });
  expect(response.ok()).toBeTruthy();
  const payload = await response.json();
  return (payload.user ?? payload) as SessionUser;
}

async function expectDeniedPayload(response: APIResponse) {
  expect([401, 403, 404, 405, 500]).toContain(response.status());
  const payload = await response.json().catch(async () => ({ text: await response.text().catch(() => "") }));
  const serialized = JSON.stringify(payload).toLowerCase();
  expect(serialized).not.toContain("secret");
  expect(serialized).not.toContain("salary_snapshot");
  expect(serialized).not.toContain("tenant.bank.debit_account.payroll.v1");
  expect(serialized).not.toContain("payroll.provider.bank.live.v1");
}

test.describe("Phase 7A role and workspace access boundaries", () => {
  test("protected workspaces redirect unauthenticated sessions to login", async ({ page }, testInfo) => {
    await page.context().clearCookies();
    for (const path of ["/hr-admin", "/tenant-admin", "/platform-admin", "/ess", "/mss/approvals", "/support"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login$/);
      await expect(page.getByText("Live workspace load failed.")).toHaveCount(0);
      await expect(page.getByText("could not load the current workspace")).toHaveCount(0);
    }
    await captureSecurityStep(page, testInfo, "01-unauthenticated-login-redirect");
  });

  test("workspace chooser hides privileged links after low-privilege sign-in", async ({ page }, testInfo) => {
    await switchPersona(page, employee, "/");
    await expectPageReady(page, "Choose your workspace");
    const user = await sessionUser(page);
    const expectedLabels = [
      user.workspace_access.ess ? "Open ESS" : "ESS restricted",
      user.default_membership?.role_codes?.includes("hr-admin") ? "Open HR admin" : "HR admin restricted",
      user.workspace_access.platform_admin ? "Open platform console" : "Platform admin restricted",
      user.workspace_access.tenant_admin ? "Open tenant console" : "Tenant admin restricted",
      user.workspace_access.mss ? "Open MSS" : "Manager access required",
    ];
    for (const label of expectedLabels) {
      await expect(page.getByText(label).first()).toBeVisible();
    }
    await expectNoHorizontalOverflow(page);
    await captureSecurityStep(page, testInfo, "02-employee-workspace-chooser-boundary");
  });

  test("role-scoped pages fail closed across employee, manager, HR admin, and platform admin", async ({ page }, testInfo) => {
    await switchPersona(page, employee, "/hr-admin");
    const employeeUser = await sessionUser(page);
    if (employeeUser.default_membership?.role_codes?.includes("hr-admin")) {
      await expectPageReady(page, "HR Control Center");
    } else {
      await expect(page).toHaveURL(/\/$/);
      await expectPageReady(page, "Choose your workspace");
      await expect(page.getByText("HR admin restricted")).toBeVisible();
    }

    await switchPersona(page, manager, "/platform-admin");
    const managerUser = await sessionUser(page);
    if (managerUser.workspace_access.platform_admin) {
      await expectPageReady(page, "Platform Control Center");
    } else {
      await expect(page).toHaveURL(/\/$/);
      await expectPageReady(page, "Choose your workspace");
      await expect(page.getByText("Platform admin restricted")).toBeVisible();
    }

    await switchPersona(page, hrAdmin, "/platform-admin");
    const hrUser = await sessionUser(page);
    if (hrUser.workspace_access.platform_admin) {
      await expectPageReady(page, "Platform Control Center");
    } else {
      await expect(page).toHaveURL(/\/$/);
      await expectPageReady(page, "Choose your workspace");
      await expect(page.getByText("Platform admin restricted")).toBeVisible();
    }

    await switchPersona(page, platformAdmin, "/hr-admin");
    const platformUser = await sessionUser(page);
    if (platformUser.default_membership?.role_codes?.includes("hr-admin")) {
      await expectPageReady(page, "HR Control Center");
    } else {
      await expect(page).toHaveURL(/\/$/);
      await expectPageReady(page, "Choose your workspace");
      await expect(page.getByText("HR admin restricted")).toBeVisible();
    }
    await expectNoHorizontalOverflow(page);
    await captureSecurityStep(page, testInfo, "03-cross-role-page-denials");
  });

  test("sensitive payroll artifact and support routes deny wrong or missing sessions", async ({ page }, testInfo) => {
    await switchPersona(page, hrAdmin, "/hr-admin/payroll-outputs");
    await expectPageReady(page, "Payroll Outputs");
    const downloadHref = await page.getByRole("link", { name: "Download file" }).first().getAttribute("href");
    expect(downloadHref).toMatch(/^\/api\/hr-admin\/payroll-output-artifacts\/[^/]+\/download/);

    const hrDownload = await page.request.get(downloadHref ?? "");
    expect(hrDownload.status()).toBe(200);
    expect(hrDownload.headers()["x-payroll-artifact-checksum"]).toBeTruthy();

    await switchPersona(page, employee, "/ess/payslips");
    await expectPageReady(page, "Payslips");
    await expectDeniedPayload(await page.request.get(downloadHref ?? ""));
    await expectDeniedPayload(await page.request.get("/api/support/tenant-console?tenant_code=northstar-foods&scope_ref=payroll_support"));

    await switchPersona(page, hrAdmin, "/support");
    await expectPageReady(page, "Support Console");
    await expect(page.getByText("Support Session Denied", { exact: true }).or(page.getByText("No active support session")).first()).toBeVisible();
    await expect(page.getByText("Commercial evidence scope is not available for this session.").first()).toBeVisible();

    await page.context().clearCookies();
    await expectDeniedPayload(await page.request.post("/api/hr-admin/notifications/bulk-retry", {
      data: { notification_ids: ["00000000-0000-0000-0000-000000000000"], process_now: true },
    }));
    await expectNoHorizontalOverflow(page);
    await captureSecurityStep(page, testInfo, "04-sensitive-route-denials");
  });
});
