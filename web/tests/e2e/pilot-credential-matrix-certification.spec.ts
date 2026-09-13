import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";

import { expect, type APIResponse, type Page, test, type TestInfo } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { employee, hrAdmin, manager, platformAdmin, type Persona } from "../helpers/staging-auth";

type SessionUser = {
  username?: string;
  workspace_access?: {
    ess?: boolean;
    mss?: boolean;
    hr_admin?: boolean;
    tenant_admin?: boolean;
    platform_admin?: boolean;
  };
  default_membership?: {
    tenant_code?: string;
    role_codes?: string[];
  } | null;
  user?: SessionUser;
};

type MatrixPersona = {
  label: string;
  persona: Persona;
  landingPath: string;
  heading: string;
  expectedAccess: Partial<NonNullable<SessionUser["workspace_access"]>>;
  expectedRoles?: string[];
  deniedPaths: Array<{
    path: string;
    deniedText: RegExp;
  }>;
};

const pilotPrefix = process.env.PLAYWRIGHT_PILOT100_PREFIX ?? "PILOT100_20260912";
const pilotEmployee: Persona = {
  username: process.env.PLAYWRIGHT_PILOT100_EMPLOYEE_USERNAME ?? `${pilotPrefix.toLowerCase()}.e011`,
  password: process.env.PLAYWRIGHT_LIVE_SEED_PASSWORD ?? "Password@123",
};

const matrix: MatrixPersona[] = [
  {
    label: "Platform admin",
    persona: platformAdmin,
    landingPath: "/platform-admin",
    heading: "Platform Admin Console",
    expectedAccess: { platform_admin: true },
    deniedPaths: [
      { path: "/ess", deniedText: /Choose your workspace|Self Service/i },
    ],
  },
  {
    label: "HR admin",
    persona: hrAdmin,
    landingPath: "/hr-admin",
    heading: "Control center",
    expectedAccess: { hr_admin: true, tenant_admin: true },
    expectedRoles: ["hr-admin"],
    deniedPaths: [
      { path: "/platform-admin", deniedText: /Platform admin restricted|Choose your workspace/i },
    ],
  },
  {
    label: "Manager",
    persona: manager,
    landingPath: "/mss/approvals",
    heading: "Manager inbox",
    expectedAccess: { mss: true },
    expectedRoles: ["manager"],
    deniedPaths: [
      { path: "/platform-admin", deniedText: /Platform admin restricted|Choose your workspace/i },
      { path: "/hr-admin", deniedText: /HR admin restricted|Choose your workspace/i },
    ],
  },
  {
    label: "Seed employee",
    persona: employee,
    landingPath: "/ess",
    heading: "Self Service",
    expectedAccess: { ess: true },
    expectedRoles: ["employee"],
    deniedPaths: [
      { path: "/platform-admin", deniedText: /Platform admin restricted|Choose your workspace/i },
      { path: "/hr-admin", deniedText: /HR admin restricted|Choose your workspace/i },
    ],
  },
  {
    label: "Pilot employee",
    persona: pilotEmployee,
    landingPath: "/ess/payslips",
    heading: "Payslips",
    expectedAccess: { ess: true },
    expectedRoles: ["employee"],
    deniedPaths: [
      { path: "/platform-admin", deniedText: /Platform admin restricted|Choose your workspace/i },
      { path: "/hr-admin/payroll-outputs", deniedText: /HR admin restricted|Choose your workspace/i },
    ],
  },
];

async function captureCredentialStep(page: Page, testInfo: TestInfo, name: string) {
  const path = testInfo.outputPath(`pilot-credential-matrix/${name}.png`);
  await mkdir(dirname(path), { recursive: true });
  await page.screenshot({ path, fullPage: true });
}

async function loginAs(page: Page, persona: Persona, path = "/") {
  await page.request.post("/api/auth/logout").catch(() => null);
  await page.context().clearCookies();
  const response = await page.request.post("/api/auth/login", {
    data: {
      identifier: persona.username,
      password: persona.password,
    },
  });
  expect(response.ok(), `Login should succeed for ${persona.username}`).toBeTruthy();
  await page.goto(path, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
}

async function authToken(page: Page) {
  const token = (await page.context().cookies()).find((cookie) => cookie.name === "hrms_access_token")?.value;
  expect(token, "Expected authenticated browser session token.").toBeTruthy();
  return token!;
}

async function sessionUser(page: Page) {
  const apiBase = process.env.HRMS_API_BASE_URL ?? "http://127.0.0.1:8012/api/v1";
  const response = await page.request.get(`${apiBase}/auth/session/`, {
    headers: { Authorization: `Token ${await authToken(page)}` },
  });
  expect(response.ok()).toBeTruthy();
  const payload = (await response.json()) as SessionUser;
  return payload.user ?? payload;
}

async function expectDeniedPayload(response: APIResponse, label: string) {
  expect([401, 403, 404, 405], `${label} should fail closed`).toContain(response.status());
  const payload = await response.json().catch(async () => ({ text: await response.text().catch(() => "") }));
  const serialized = JSON.stringify(payload).toLowerCase();
  for (const forbidden of ["password", "secret", "token", "salary_snapshot", "debit_account", "private_key"]) {
    expect(serialized, `${label} should not leak ${forbidden}`).not.toContain(forbidden);
  }
}

test.describe.serial("Pilot credential matrix certification", () => {
  for (const entry of matrix) {
    test(`${entry.label} can use intended workspace and is denied unsafe cross-role pages`, async ({ page }, testInfo) => {
      test.setTimeout(180_000);

      await loginAs(page, entry.persona, entry.landingPath);
      await expectPageReady(page, entry.heading);
      await expectNoHorizontalOverflow(page);

      const user = await sessionUser(page);
      expect(user.username).toBe(entry.persona.username);
      for (const [workspace, expected] of Object.entries(entry.expectedAccess)) {
        expect(
          user.workspace_access?.[workspace as keyof NonNullable<SessionUser["workspace_access"]>],
          `${entry.label} ${workspace}`,
        ).toBe(expected);
      }
      for (const role of entry.expectedRoles ?? []) {
        expect(user.default_membership?.role_codes ?? [], `${entry.label} should include ${role}`).toContain(role);
      }
      await captureCredentialStep(page, testInfo, `${entry.label.toLowerCase().replaceAll(" ", "-")}-allowed`);

      for (const denied of entry.deniedPaths) {
        await page.goto(denied.path, { waitUntil: "domcontentloaded" });
        await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
        await expect(page.getByText(denied.deniedText).first()).toBeVisible();
        await expectNoHorizontalOverflow(page);
      }
    });
  }

  test("credential matrix denies sensitive APIs to low-privilege pilot users", async ({ page }) => {
    await loginAs(page, pilotEmployee, "/ess/payslips");
    await expectPageReady(page, "Payslips");

    await expectDeniedPayload(await page.request.get("/api/hr-admin/reports/payroll-register"), "pilot employee payroll register export");
    await expectDeniedPayload(await page.request.get("/api/hr-admin/payroll-output-setup"), "pilot employee payroll output setup");
    await expectDeniedPayload(
      await page.request.get("/api/support/tenant-console?tenant_code=northstar-foods&scope_ref=payroll_support"),
      "pilot employee support tenant console",
    );

    await loginAs(page, manager, "/mss/approvals");
    await expectPageReady(page, "Manager inbox");
    await expectDeniedPayload(await page.request.get("/api/hr-admin/reports/finance-handoff-exceptions"), "manager finance handoff report");
    await expectDeniedPayload(await page.request.get("/api/platform-admin/tenants"), "manager platform tenant list");
  });
});
