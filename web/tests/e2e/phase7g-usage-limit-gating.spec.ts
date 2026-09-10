import { execFile } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { promisify } from "node:util";

import { expect, type APIResponse, type Page, test, type TestInfo } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { hrAdmin, type Persona } from "../helpers/staging-auth";

const execFileAsync = promisify(execFile);
const repoRoot = resolve(__dirname, "../../..");

type CommercialControl = {
  tenant: { subscription_plan: string };
  subscription: {
    status: string;
    billing_provider_ref: string;
    billing_account_ref: string;
    current_period_end: string;
  };
  summary: {
    can_launch: boolean;
    exceeded_usage_limit_count: number;
  };
  usage_limits: Array<{
    meter_ref: string;
    label: string;
    current_value: number;
    limit_value: number;
    remaining_value: number | null;
    status: string;
  }>;
  exceeded_usage_limits: string[];
  enforcement: {
    blocking_scope_count: number;
    scopes: Array<{
      scope_ref: string;
      allowed: boolean;
      exceeded_usage_limits: string[];
      blocking_reasons: string[];
    }>;
  };
};

async function captureUsageStep(page: Page, testInfo: TestInfo, name: string) {
  const path = testInfo.outputPath(`phase7g-usage-limit-gating/${name}.png`);
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

function apiBaseUrl() {
  return process.env.HRMS_API_BASE_URL ?? "http://127.0.0.1:8012/api/v1";
}

async function authHeaders(page: Page) {
  const token = (await page.context().cookies()).find((cookie) => cookie.name === "hrms_access_token")?.value;
  expect(token).toBeTruthy();
  return { Authorization: `Token ${token}` };
}

async function getCommercialControl(page: Page) {
  const response = await page.request.get(`${apiBaseUrl()}/hr-admin/saas-control-plane/`, {
    headers: await authHeaders(page),
  });
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as CommercialControl;
}

async function runDjangoScript(script: string) {
  const { stdout } = await execFileAsync(resolve(repoRoot, ".venv/bin/python"), ["backend/manage.py", "shell", "-c", script], { cwd: repoRoot });
  return stdout.trim();
}

async function forceActiveMembershipLimitExceeded() {
  const script = String.raw`
import json
from copy import deepcopy
from django.utils import timezone
from apps.common.selectors import DEFAULT_SAAS_COMMERCIAL_PROFILE, SAAS_COMMERCIAL_PROFILE_CONFIG_KEY
from apps.iam.models import MembershipStatus, TenantMembership
from apps.platform_config.models import ConfigCategory, ConfigDataType, ConfigStatus, ConfigurationDefinition, TenantConfiguration
from apps.tenants.models import Tenant

tenant = Tenant.objects.get(code="northstar-foods")
definition, _ = ConfigurationDefinition.objects.update_or_create(
    key=SAAS_COMMERCIAL_PROFILE_CONFIG_KEY,
    defaults={
        "name": "SaaS commercial profile",
        "category": ConfigCategory.SECURITY,
        "data_type": ConfigDataType.JSON,
        "description": "Tenant commercial profile for plan, subscription, entitlement, usage-limit, and enforcement policy.",
        "default_value": DEFAULT_SAAS_COMMERCIAL_PROFILE,
        "is_system_managed": True,
    },
)
config, _ = TenantConfiguration.objects.get_or_create(
    tenant=tenant,
    definition=definition,
    defaults={
        "status": ConfigStatus.PUBLISHED,
        "current_value": {},
        "published_value": {},
        "published_at": timezone.now(),
        "published_by_note": "phase7g-create",
    },
)
backup = {
    "tenant_subscription_plan": tenant.subscription_plan,
    "status": config.status,
    "current_value": config.current_value,
    "published_value": config.published_value,
    "version": config.version,
    "published_at": config.published_at.isoformat() if config.published_at else None,
    "published_by_note": config.published_by_note,
}
profile = deepcopy(config.published_value if config.status == ConfigStatus.PUBLISHED else config.current_value)
if not isinstance(profile, dict):
    profile = {}
plans = profile.setdefault("plans", {})
growth = plans.setdefault("growth", {})
limits = growth.setdefault("usage_limits", {})
active_count = TenantMembership.objects.filter(tenant=tenant, status=MembershipStatus.ACTIVE).count()
limits["active_memberships"] = max(active_count - 1, 1)
config.current_value = profile
config.published_value = profile
config.status = ConfigStatus.PUBLISHED
config.version += 1
config.published_at = timezone.now()
config.published_by_note = "phase7g-usage-limit"
config.save()
tenant.subscription_plan = "growth"
tenant.save(update_fields=["subscription_plan", "updated_at"])
print(json.dumps(backup, default=str))
`;
  return JSON.parse(await runDjangoScript(script));
}

async function restoreCommercialProfile(backup: unknown) {
  const script = `
import json
from django.utils.dateparse import parse_datetime
from apps.common.selectors import SAAS_COMMERCIAL_PROFILE_CONFIG_KEY
from apps.platform_config.models import TenantConfiguration
from apps.tenants.models import Tenant

backup = json.loads(${JSON.stringify(JSON.stringify(backup))})
tenant = Tenant.objects.get(code="northstar-foods")
config = TenantConfiguration.objects.get(tenant=tenant, definition__key=SAAS_COMMERCIAL_PROFILE_CONFIG_KEY)
tenant.subscription_plan = backup["tenant_subscription_plan"]
tenant.save(update_fields=["subscription_plan", "updated_at"])
config.status = backup["status"]
config.current_value = backup["current_value"]
config.published_value = backup["published_value"]
config.version = backup["version"]
config.published_at = parse_datetime(backup["published_at"]) if backup.get("published_at") else None
config.published_by_note = backup["published_by_note"]
config.save()
`;
  await runDjangoScript(script);
}

async function expectCommercialUsageDenied(response: APIResponse, scopeRef: string) {
  expect(response.status()).toBe(403);
  const payload = await response.json();
  const serialized = JSON.stringify(payload).toLowerCase();
  expect(serialized).toContain("saas_commercial_access_denied");
  expect(serialized).toContain(scopeRef);
  expect(serialized).toContain("usage_limit_exceeded");
  expect(serialized).toContain("active_memberships");
}

test.describe("Phase 7G usage-limit gating", () => {
  test("active membership limit blocks launch, payroll access, and new active member activation", async ({ page }, testInfo) => {
    await switchPersona(page, hrAdmin, "/hr-admin/saas-control-plane");
    await expectPageReady(page, "SaaS Control Plane");
    const original = await getCommercialControl(page);
    const backup = await forceActiveMembershipLimitExceeded();

    try {
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
      await expectPageReady(page, "SaaS Control Plane");
      const exceeded = await getCommercialControl(page);
      const membershipUsage = exceeded.usage_limits.find((item) => item.meter_ref === "active_memberships");
      expect(membershipUsage).toBeTruthy();
      expect(membershipUsage?.status).toBe("exceeded");
      expect(exceeded.summary.can_launch).toBe(false);
      expect(exceeded.summary.exceeded_usage_limit_count).toBeGreaterThanOrEqual(1);
      expect(exceeded.exceeded_usage_limits).toContain("active_memberships");
      expect(exceeded.enforcement.scopes.find((scope) => scope.scope_ref === "payroll_core")?.allowed).toBe(false);
      expect(exceeded.enforcement.scopes.find((scope) => scope.scope_ref === "payroll_core")?.blocking_reasons).toContain("usage_limit_exceeded");

      await expect(page.getByText("SaaS Control Plane")).toBeVisible();
      await expect(page.getByText("Usage exceptions")).toBeVisible();
      await expect(page.getByText("Limit exceeded", { exact: true })).toBeVisible();
      await expect(page.getByText("Active Memberships").first()).toBeVisible();
      await expect(page.getByText("Exceeded").first()).toBeVisible();
      await expect(page.getByText("Payroll core").first()).toBeVisible();
      await expect(page.getByText("usage_limit_exceeded").first()).toBeVisible();
      await expectNoHorizontalOverflow(page);
      await captureUsageStep(page, testInfo, "01-control-plane-limit-exceeded");

      const headers = await authHeaders(page);
      await expectCommercialUsageDenied(await page.request.get(`${apiBaseUrl()}/hr-admin/payroll-setup/`, { headers }), "payroll_core");
      await expectCommercialUsageDenied(await page.request.get(`${apiBaseUrl()}/hr-admin/salary-components/`, { headers }), "payroll_core");

      await page.goto("/hr-admin/payroll-setup", { waitUntil: "domcontentloaded" });
      await expect(page.getByText("Live workspace load failed.").or(page.getByText("HR admin could not load the current workspace")).first()).toBeVisible();
      await expect(page.getByText("Live API request failed with status 403.").first()).toBeVisible();
      await expectNoHorizontalOverflow(page);
      await captureUsageStep(page, testInfo, "02-payroll-page-usage-denied");

      await switchPersona(page, hrAdmin, "/tenant-admin");
      await expectPageReady(page, "Tenant Admin Console");
      await expect(page.getByRole("main").getByText("Seats", { exact: true }).first()).toBeVisible();
      await expect(page.getByRole("main").getByText("Blocked").first()).toBeVisible();
      const stamp = Date.now();
      await page.getByRole("main").getByLabel("Email").fill(`phase7g-${stamp}@example.test`);
      await page.getByRole("main").getByLabel("Username").fill(`phase7g.${stamp}`);
      await page.getByRole("main").getByLabel("First name").fill("Phase");
      await page.getByRole("main").getByLabel("Last name").fill("SevenG");
      await page.getByRole("main").getByLabel("Status").selectOption("active");
      const inviteButton = page.getByRole("main").getByRole("button", { name: "Invite member" });
      await expect(inviteButton).toBeEnabled();
      const inviteResponsePromise = page.waitForResponse(
        (response) => response.url().includes("/api/tenant-admin/memberships") && response.request().method() === "POST",
        { timeout: 20_000 },
      );
      await inviteButton.click();
      const inviteResponse = await inviteResponsePromise;
      expect(inviteResponse.status()).toBe(400);
      await expect(page.getByRole("status")).toContainText("active membership limit");
      await expectNoHorizontalOverflow(page);
      await captureUsageStep(page, testInfo, "03-active-member-invite-limit-denied");
    } finally {
      await restoreCommercialProfile(backup);
      await switchPersona(page, hrAdmin, "/hr-admin/saas-control-plane");
      const restored = await getCommercialControl(page);
      expect(restored.tenant.subscription_plan).toBe(original.tenant.subscription_plan);
      expect(restored.subscription.status).toBe(original.subscription.status);
    }
  });
});
