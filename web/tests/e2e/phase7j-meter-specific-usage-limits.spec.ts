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
  subscription: { status: string };
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
    scopes: Array<{
      scope_ref: string;
      allowed: boolean;
      exceeded_usage_limits: string[];
      blocking_reasons: string[];
    }>;
  };
};

async function captureMeterStep(page: Page, testInfo: TestInfo, name: string) {
  const path = testInfo.outputPath(`phase7j-meter-specific-usage-limits/${name}.png`);
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

async function forcePayrollRunAndProviderConnectionMetersExceeded() {
  const script = String.raw`
import json
from copy import deepcopy
from datetime import date, timedelta
from django.utils import timezone
from apps.common.selectors import DEFAULT_SAAS_COMMERCIAL_PROFILE, SAAS_COMMERCIAL_PROFILE_CONFIG_KEY
from apps.platform_config.models import ConfigCategory, ConfigDataType, ConfigStatus, ConfigurationDefinition, TenantConfiguration
from apps.payroll.models import PayrollCalendar, PayrollFrequency, PayrollPeriod, PayrollProviderConnection, PayrollProviderConnectionKind, PayrollRun, PayrollRunStatus
from apps.tenants.models import Tenant

tenant = Tenant.objects.get(code="northstar-foods")
created_run_ids = []
created_provider_connection_ids = []
stamp = timezone.now().strftime("%Y%m%d%H%M%S%f")

if PayrollRun.objects.filter(tenant=tenant, created_at__date__gte=date.today().replace(day=1)).count() == 0:
    calendar, _ = PayrollCalendar.objects.get_or_create(
        tenant=tenant,
        code=f"phase7j-calendar-{stamp}",
        defaults={"name": "Phase 7J Disposable Calendar", "frequency": PayrollFrequency.MONTHLY, "timezone": "Asia/Kolkata"},
    )
    period_start = date.today().replace(day=1)
    period, _ = PayrollPeriod.objects.get_or_create(
        tenant=tenant,
        calendar=calendar,
        code=f"phase7j-period-{stamp}",
        defaults={
            "name": "Phase 7J Disposable Period",
            "start_date": period_start,
            "end_date": period_start + timedelta(days=27),
            "pay_date": period_start + timedelta(days=28),
        },
    )
    run = PayrollRun.objects.create(
        tenant=tenant,
        period=period,
        code=f"phase7j-run-{stamp}",
        name="Phase 7J Disposable Payroll Run",
        status=PayrollRunStatus.DRAFT,
    )
    created_run_ids.append(str(run.id))

if PayrollProviderConnection.objects.filter(tenant=tenant).count() == 0:
    connection = PayrollProviderConnection.objects.create(
        tenant=tenant,
        provider_ref=f"phase7j-provider-{stamp}",
        provider_name="Phase 7J Disposable Provider",
        provider_kind=PayrollProviderConnectionKind.OTHER,
        environment_ref="sandbox",
    )
    created_provider_connection_ids.append(str(connection.id))

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
        "published_by_note": "phase7j-create",
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
    "created_run_ids": created_run_ids,
    "created_provider_connection_ids": created_provider_connection_ids,
}
profile = deepcopy(config.published_value if config.status == ConfigStatus.PUBLISHED else config.current_value)
if not isinstance(profile, dict):
    profile = {}
plans = profile.setdefault("plans", {})
growth = plans.setdefault("growth", {})
limits = growth.setdefault("usage_limits", {})
payroll_run_count = PayrollRun.objects.filter(tenant=tenant, created_at__date__gte=date.today().replace(day=1)).count()
provider_connection_count = PayrollProviderConnection.objects.filter(tenant=tenant).count()
limits["payroll_runs_per_month"] = max(payroll_run_count - 1, 0)
limits["provider_connections"] = max(provider_connection_count - 1, 0)
config.current_value = profile
config.published_value = profile
config.status = ConfigStatus.PUBLISHED
config.version += 1
config.published_at = timezone.now()
config.published_by_note = "phase7j-meter-specific-usage-limits"
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
from apps.payroll.models import PayrollProviderConnection, PayrollRun
from apps.tenants.models import Tenant

backup = json.loads(${JSON.stringify(JSON.stringify(backup))})
tenant = Tenant.objects.get(code="northstar-foods")
config = TenantConfiguration.objects.get(tenant=tenant, definition__key=SAAS_COMMERCIAL_PROFILE_CONFIG_KEY)
PayrollRun.objects.filter(id__in=backup.get("created_run_ids", []), tenant=tenant).delete()
PayrollProviderConnection.objects.filter(id__in=backup.get("created_provider_connection_ids", []), tenant=tenant).delete()
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

async function expectMeterDenied(response: APIResponse, scopeRef: string, meterRef: string) {
  expect(response.status()).toBe(403);
  const payload = await response.json();
  const serialized = JSON.stringify(payload).toLowerCase();
  expect(serialized).toContain("saas_commercial_access_denied");
  expect(serialized).toContain(scopeRef);
  expect(serialized).toContain("usage_limit_exceeded");
  expect(serialized).toContain(meterRef);
}

test.describe("Phase 7J meter-specific usage-limit gating", () => {
  test("payroll run and provider connection meters block their own SaaS enforcement scopes", async ({ page }, testInfo) => {
    await switchPersona(page, hrAdmin, "/hr-admin/saas-control-plane");
    await expectPageReady(page, "SaaS Control Plane");
    const original = await getCommercialControl(page);
    const backup = await forcePayrollRunAndProviderConnectionMetersExceeded();

    try {
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
      await expectPageReady(page, "SaaS Control Plane");

      const exceeded = await getCommercialControl(page);
      for (const meterRef of ["payroll_runs_per_month", "provider_connections"]) {
        const usage = exceeded.usage_limits.find((item) => item.meter_ref === meterRef);
        expect(usage).toBeTruthy();
        expect(usage?.status).toBe("exceeded");
        expect(usage?.current_value).toBeGreaterThan(usage?.limit_value ?? Number.MAX_SAFE_INTEGER);
        expect(exceeded.exceeded_usage_limits).toContain(meterRef);
      }

      const payrollScope = exceeded.enforcement.scopes.find((scope) => scope.scope_ref === "payroll_core");
      const providerScope = exceeded.enforcement.scopes.find((scope) => scope.scope_ref === "payroll_provider_integrations");
      expect(exceeded.summary.can_launch).toBe(false);
      expect(exceeded.summary.exceeded_usage_limit_count).toBeGreaterThanOrEqual(2);
      expect(payrollScope?.allowed).toBe(false);
      expect(payrollScope?.blocking_reasons).toContain("usage_limit_exceeded");
      expect(payrollScope?.exceeded_usage_limits).toContain("payroll_runs_per_month");
      expect(providerScope?.allowed).toBe(false);
      expect(providerScope?.blocking_reasons).toContain("usage_limit_exceeded");
      expect(providerScope?.exceeded_usage_limits).toContain("provider_connections");

      await expect(page.getByText("SaaS Control Plane")).toBeVisible();
      await expect(page.getByText("Usage exceptions")).toBeVisible();
      await expect(page.getByText("Limit exceeded", { exact: true })).toBeVisible();
      await expect(page.getByText("Payroll Runs Per Month").first()).toBeVisible();
      await expect(page.getByText("Provider Connections").first()).toBeVisible();
      await expect(page.getByText("payroll_runs_per_month").first()).toBeVisible();
      await expect(page.getByText("provider_connections").first()).toBeVisible();
      await expect(page.getByText("Payroll core").first()).toBeVisible();
      await expect(page.getByText("Payroll provider integrations").first()).toBeVisible();
      await expect(page.getByText("usage_limit_exceeded").first()).toBeVisible();
      await expectNoHorizontalOverflow(page);
      await captureMeterStep(page, testInfo, "01-control-plane-meter-exceptions");

      const headers = await authHeaders(page);
      await expectMeterDenied(await page.request.get(`${apiBaseUrl()}/hr-admin/payroll-setup/`, { headers }), "payroll_core", "payroll_runs_per_month");
      await expectMeterDenied(
        await page.request.get(`${apiBaseUrl()}/hr-admin/payroll-provider-connections/`, { headers }),
        "payroll_provider_integrations",
        "provider_connections",
      );

      await page.goto("/hr-admin/payroll-setup", { waitUntil: "domcontentloaded" });
      await expect(page.getByText("Live workspace load failed.").or(page.getByText("HR admin could not load the current workspace")).first()).toBeVisible();
      await expect(page.getByText("Live API request failed with status 403.").first()).toBeVisible();
      await expectNoHorizontalOverflow(page);
      await captureMeterStep(page, testInfo, "02-payroll-setup-meter-denied");

      await page.goto("/hr-admin/payroll-providers", { waitUntil: "domcontentloaded" });
      await expect(page.getByText("Live workspace load failed.").or(page.getByText("HR admin could not load the current workspace")).first()).toBeVisible();
      await expect(page.getByText("Live API request failed with status 403.").first()).toBeVisible();
      await expectNoHorizontalOverflow(page);
      await captureMeterStep(page, testInfo, "03-payroll-providers-meter-denied");
    } finally {
      await restoreCommercialProfile(backup);
      await switchPersona(page, hrAdmin, "/hr-admin/saas-control-plane");
      const restored = await getCommercialControl(page);
      expect(restored.tenant.subscription_plan).toBe(original.tenant.subscription_plan);
      expect(restored.subscription.status).toBe(original.subscription.status);
    }
  });
});
