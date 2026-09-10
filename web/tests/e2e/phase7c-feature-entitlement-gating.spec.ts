import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";

import { expect, type APIResponse, type Page, test, type TestInfo } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { hrAdmin, type Persona } from "../helpers/staging-auth";

type CommercialControl = {
  tenant: {
    subscription_plan: string;
  };
  subscription: {
    status: string;
    billing_provider_ref: string;
    billing_account_ref: string;
    current_period_end: string;
  };
  summary: {
    can_launch: boolean;
    missing_required_entitlement_count: number;
  };
  missing_required_entitlements: string[];
  enforcement: {
    blocking_scope_count: number;
    scopes: Array<{
      scope_ref: string;
      allowed: boolean;
      missing_entitlements: string[];
      blocking_reasons: string[];
    }>;
  };
};

async function captureEntitlementStep(page: Page, testInfo: TestInfo, name: string) {
  const path = testInfo.outputPath(`phase7c-feature-entitlement-gating/${name}.png`);
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

async function getCommercialControl(page: Page) {
  const response = await page.request.get(`${apiBaseUrl()}/hr-admin/saas-control-plane/`, {
    headers: await authHeaders(page),
  });
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as CommercialControl;
}

function apiBaseUrl() {
  return process.env.HRMS_API_BASE_URL ?? "http://127.0.0.1:8012/api/v1";
}

async function patchCommercialControl(page: Page, payload: Record<string, string>) {
  const response = await page.request.patch("/api/hr-admin/saas-control-plane", { data: payload });
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as CommercialControl;
}

async function authHeaders(page: Page) {
  const token = (await page.context().cookies()).find((cookie) => cookie.name === "hrms_access_token")?.value;
  expect(token).toBeTruthy();
  return { Authorization: `Token ${token}` };
}

async function expectCommercialDenied(response: APIResponse, scopeRef: string) {
  expect(response.status()).toBe(403);
  const payload = await response.json();
  const serialized = JSON.stringify(payload).toLowerCase();
  expect(serialized).toContain("saas_commercial_access_denied");
  expect(serialized).toContain(scopeRef);
  expect(serialized).toContain("entitlement_missing");
  expect(serialized).toContain("payroll");
  expect(serialized).not.toContain("tenant.bank.debit_account.payroll.v1");
  expect(serialized).not.toContain("payroll.provider.bank.live.v1");
}

test.describe("Phase 7C feature entitlement gating", () => {
  test("starter plan blocks payroll and provider functionality through browser and API", async ({ page }, testInfo) => {
    await switchPersona(page, hrAdmin, "/hr-admin/saas-control-plane");
    await expectPageReady(page, "SaaS Control Plane");
    const original = await getCommercialControl(page);

    try {
      const downgraded = await patchCommercialControl(page, {
        subscription_plan: "starter",
        status: "active",
        billing_provider_ref: original.subscription.billing_provider_ref || "manual_billing.v1",
        billing_account_ref: original.subscription.billing_account_ref,
        current_period_end: original.subscription.current_period_end,
      });
      expect(downgraded.summary.can_launch).toBe(false);
      expect(downgraded.missing_required_entitlements).toContain("payroll");
      expect(downgraded.missing_required_entitlements).toContain("payroll_provider_integrations");
      expect(downgraded.enforcement.blocking_scope_count).toBeGreaterThanOrEqual(2);
      expect(downgraded.enforcement.scopes.find((scope) => scope.scope_ref === "payroll_core")?.allowed).toBe(false);
      expect(downgraded.enforcement.scopes.find((scope) => scope.scope_ref === "payroll_provider_integrations")?.allowed).toBe(false);

      await page.reload({ waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
      await expectPageReady(page, "SaaS Control Plane");
      await expect(page.getByText("Launch commercial gate")).toBeVisible();
      await expect(page.getByText("Blocked").first()).toBeVisible();
      await expect(page.getByText("Payroll core").first()).toBeVisible();
      await expect(page.getByText("Payroll provider integrations").first()).toBeVisible();
      await expect(page.getByText("payroll_provider_integrations").first()).toBeVisible();
      await expect(page.getByLabel("Payroll unavailable")).toBeVisible();
      await expect(page.getByLabel("Providers unavailable")).toBeVisible();
      await expect(page.getByLabel("Payroll unavailable")).toHaveAttribute("aria-disabled", "true");
      await expect(page.getByLabel("Providers unavailable")).toHaveAttribute("aria-disabled", "true");
      await expect(page.getByLabel("Payroll unavailable")).toContainText("Plan missing payroll");
      await expect(page.getByLabel("Providers unavailable")).toContainText("Plan missing payroll, payroll_provider_integrations");
      await expect(page.getByRole("link", { name: /Payroll Source readiness/ })).toHaveCount(0);
      await expect(page.getByRole("link", { name: /Providers Payroll integrations/ })).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Save state" })).toBeEnabled();
      await captureEntitlementStep(page, testInfo, "01-starter-plan-blocked-control-plane");

      const headers = await authHeaders(page);
      await expectCommercialDenied(await page.request.get(`${apiBaseUrl()}/hr-admin/payroll-setup/`, { headers }), "payroll_core");
      await expectCommercialDenied(await page.request.get(`${apiBaseUrl()}/hr-admin/salary-components/`, { headers }), "payroll_core");
      await expectCommercialDenied(await page.request.post(`${apiBaseUrl()}/hr-admin/payroll-runs/`, {
        headers,
        data: { code: "phase7c-denied-run", name: "Phase 7C denied run" },
      }), "payroll_core");
      await expectCommercialDenied(await page.request.get(`${apiBaseUrl()}/hr-admin/payroll-provider-connections/`, { headers }), "payroll_provider_integrations");
      await expectCommercialDenied(await page.request.post(`${apiBaseUrl()}/hr-admin/payroll-provider-connections/00000000-0000-0000-0000-000000000000/run-certification/`, {
        headers,
        data: { scenario_ref: "phase7c-denied" },
      }), "payroll_provider_integrations");

      await page.goto("/hr-admin/payroll-setup");
      await expect(page.getByText("Live workspace load failed.").or(page.getByText("HR admin could not load the current workspace")).first()).toBeVisible();
      await expect(page.getByText("Live API request failed with status 403.").first()).toBeVisible();
      await expect(page.getByText("saas_commercial_access_denied").first()).toHaveCount(0);
      await expectNoHorizontalOverflow(page);
      await captureEntitlementStep(page, testInfo, "02-payroll-page-fails-closed");
    } finally {
      await switchPersona(page, hrAdmin, "/hr-admin/saas-control-plane");
      await patchCommercialControl(page, {
        subscription_plan: original.tenant.subscription_plan,
        status: original.subscription.status,
        billing_provider_ref: original.subscription.billing_provider_ref,
        billing_account_ref: original.subscription.billing_account_ref,
        current_period_end: original.subscription.current_period_end,
      });
    }
  });
});
