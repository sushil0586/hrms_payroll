import { execFile } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { promisify } from "node:util";

import { expect, type APIResponse, type Page, test, type TestInfo } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { hrAdmin, type Persona } from "../helpers/staging-auth";

const execFileAsync = promisify(execFile);
const repoRoot = resolve(__dirname, "../../..");

type CrossTenantFixture = {
  attackerTenantCode: string;
  protectedTenantCode: string;
  employeeId: string;
  departmentId: string;
  notificationId: string;
  artifactId: string;
};

async function captureIsolationStep(page: Page, testInfo: TestInfo, name: string) {
  const path = testInfo.outputPath(`phase7b-cross-tenant-object-isolation/${name}.png`);
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

async function createCrossTenantFixture() {
  const script = String.raw`
import json
from datetime import date, timedelta
from django.contrib.auth import get_user_model
from django.utils import timezone
from apps.employees.models import Employee
from apps.iam.models import MembershipRole, MembershipStatus, Role, TenantMembership
from apps.notifications.models import Notification, NotificationAudienceType, NotificationChannel, NotificationPriority, NotificationStatus
from apps.organizations.models import Department
from apps.payroll.models import (
    PayrollCalculationStatus,
    PayrollCalendar,
    PayrollFrequency,
    PayrollOutputArtifact,
    PayrollOutputArtifactKind,
    PayrollOutputArtifactStatus,
    PayrollOutputBatch,
    PayrollOutputBatchStatus,
    PayrollPeriod,
    PayrollReviewStatus,
    PayrollRun,
    PayrollRunCalculation,
    PayrollRunReview,
    PayrollRunStatus,
)
from apps.tenants.models import Tenant, TenantStatus, SubscriptionPlan, SeedPack

User = get_user_model()
attacker_user = User.objects.get(username="nisha.rao")
attacker_membership = TenantMembership.objects.filter(user=attacker_user, status=MembershipStatus.ACTIVE).select_related("tenant").order_by("-is_default", "created_at").first()
attacker_tenant = attacker_membership.tenant

tenant, _ = Tenant.objects.get_or_create(
    code="phase7b-isolation-tenant",
    defaults={
        "name": "Phase 7B Isolation Tenant",
        "legal_name": "Phase 7B Isolation Tenant Private Limited",
        "status": TenantStatus.ACTIVE,
        "subscription_plan": SubscriptionPlan.ENTERPRISE,
        "seed_pack": SeedPack.STANDARD_OFFICE,
        "primary_email": "phase7b-isolation@example.test",
        "timezone": "Asia/Kolkata",
        "country_code": "IN",
        "is_sandbox": True,
        "onboarding_status": "active",
    },
)
if tenant.status != TenantStatus.ACTIVE:
    tenant.status = TenantStatus.ACTIVE
    tenant.save(update_fields=["status", "updated_at"])

hr_role, _ = Role.objects.get_or_create(tenant=tenant, code="hr-admin", defaults={"name": "HR Admin", "is_system_role": True})
user, _ = User.objects.get_or_create(
    username="phase7b.hradmin",
    defaults={
        "email": "phase7b.hradmin@example.test",
        "display_name": "Phase 7B HR Admin",
        "first_name": "Phase",
        "last_name": "SevenB",
    },
)
membership, _ = TenantMembership.objects.get_or_create(
    tenant=tenant,
    user=user,
    defaults={"status": MembershipStatus.ACTIVE, "is_default": True, "employee_code": "P7B-HR"},
)
if membership.status != MembershipStatus.ACTIVE or not membership.is_default:
    membership.status = MembershipStatus.ACTIVE
    membership.is_default = True
    membership.save(update_fields=["status", "is_default", "updated_at"])
MembershipRole.objects.get_or_create(membership=membership, role=hr_role, defaults={"is_primary": True})

department, _ = Department.objects.get_or_create(
    tenant=tenant,
    code="phase7b-private-dept",
    defaults={"name": "Phase 7B Private Department", "is_active": True},
)
employee, _ = Employee.objects.get_or_create(
    tenant=tenant,
    employee_code="P7B-PRIVATE-EMP",
    defaults={
        "membership": membership,
        "first_name": "Private",
        "last_name": "Employee",
        "work_email": "private.employee.phase7b@example.test",
        "employment_status": "active",
        "department": department,
    },
)
if employee.department_id != department.id:
    employee.department = department
    employee.save(update_fields=["department", "updated_at"])

calendar, _ = PayrollCalendar.objects.get_or_create(
    tenant=tenant,
    code="phase7b-private-calendar",
    defaults={
        "name": "Phase 7B Private Calendar",
        "frequency": PayrollFrequency.MONTHLY,
        "timezone": "Asia/Kolkata",
        "currency_code": "INR",
    },
)
period_start = date(2026, 1, 1)
period, _ = PayrollPeriod.objects.get_or_create(
    tenant=tenant,
    calendar=calendar,
    code="phase7b-private-period",
    defaults={
        "name": "Phase 7B Private Period",
        "start_date": period_start,
        "end_date": period_start + timedelta(days=30),
        "pay_date": period_start + timedelta(days=31),
    },
)
payroll_run, _ = PayrollRun.objects.get_or_create(
    tenant=tenant,
    period=period,
    code="phase7b-private-run",
    defaults={
        "name": "Phase 7B Private Payroll Run",
        "status": PayrollRunStatus.LOCKED,
        "locked_at": timezone.now(),
        "final_locked_at": timezone.now(),
    },
)
if payroll_run.status != PayrollRunStatus.LOCKED:
    payroll_run.status = PayrollRunStatus.LOCKED
    payroll_run.locked_at = payroll_run.locked_at or timezone.now()
    payroll_run.final_locked_at = payroll_run.final_locked_at or timezone.now()
    payroll_run.save(update_fields=["status", "locked_at", "final_locked_at", "updated_at"])
calculation, _ = PayrollRunCalculation.objects.get_or_create(
    tenant=tenant,
    payroll_run=payroll_run,
    attempt_number=1,
    defaults={
        "status": PayrollCalculationStatus.COMPLETED,
        "calculated_at": timezone.now(),
        "totals_snapshot": {"gross_pay": "71000.00", "net_pay": "61000.00"},
    },
)
if calculation.status != PayrollCalculationStatus.COMPLETED:
    calculation.status = PayrollCalculationStatus.COMPLETED
    calculation.calculated_at = calculation.calculated_at or timezone.now()
    calculation.save(update_fields=["status", "calculated_at", "updated_at"])
review, _ = PayrollRunReview.objects.get_or_create(
    tenant=tenant,
    payroll_run=payroll_run,
    calculation=calculation,
    defaults={
        "status": PayrollReviewStatus.LOCKED,
        "locked_at": timezone.now(),
        "totals_snapshot": {"gross_pay": "71000.00", "net_pay": "61000.00"},
    },
)
if review.status != PayrollReviewStatus.LOCKED:
    review.status = PayrollReviewStatus.LOCKED
    review.locked_at = review.locked_at or timezone.now()
    review.save(update_fields=["status", "locked_at", "updated_at"])
batch, _ = PayrollOutputBatch.objects.get_or_create(
    tenant=tenant,
    payroll_run=payroll_run,
    review=review,
    output_profile_ref="phase7b-private-output-profile.v1",
    defaults={
        "status": PayrollOutputBatchStatus.PUBLISHED,
        "generated_at": timezone.now(),
        "published_at": timezone.now(),
        "totals_snapshot": {"gross_pay": "71000.00", "net_pay": "61000.00"},
    },
)
if batch.status != PayrollOutputBatchStatus.PUBLISHED:
    batch.status = PayrollOutputBatchStatus.PUBLISHED
    batch.generated_at = batch.generated_at or timezone.now()
    batch.published_at = batch.published_at or timezone.now()
    batch.save(update_fields=["status", "generated_at", "published_at", "updated_at"])
artifact, _ = PayrollOutputArtifact.objects.get_or_create(
    tenant=tenant,
    output_batch=batch,
    payroll_run=payroll_run,
    review=review,
    employee=employee,
    kind=PayrollOutputArtifactKind.PAYSLIP,
    artifact_key="phase7b-private-payslip",
    defaults={
        "status": PayrollOutputArtifactStatus.PUBLISHED,
        "title": "Phase 7B Private Payslip",
        "file_name": "phase7b-private-payslip.txt",
        "content_type": "text/plain",
        "mime_type": "text/plain",
        "file_payload": "Phase 7B private payroll artifact body must not leak.",
        "download_strategy_ref": "phase7b.private.download.v1",
        "supports_signed_url": True,
        "published_at": timezone.now(),
        "totals_snapshot": {"gross_pay": "71000.00", "net_pay": "61000.00"},
    },
)

notification, _ = Notification.objects.get_or_create(
    tenant=tenant,
    subject_type="phase7b_cross_tenant_secret",
    subject_identifier="phase7b-private-notification",
    defaults={
        "channel": NotificationChannel.IN_APP,
        "audience_type": NotificationAudienceType.MEMBERSHIP,
        "recipient_membership": membership,
        "recipient_identifier": "phase7b.hradmin",
        "recipient_address": "phase7b.hradmin@example.test",
        "title": "Phase 7B Private Notification",
        "subject": "Private tenant notification",
        "body": "Phase 7B private notification body must not leak.",
        "status": NotificationStatus.FAILED,
        "priority": NotificationPriority.HIGH,
        "payload": {"secret_marker": "phase7b-private-payload"},
    },
)

print(json.dumps({
    "attackerTenantCode": attacker_tenant.code,
    "protectedTenantCode": tenant.code,
    "employeeId": str(employee.id),
    "departmentId": str(department.id),
    "notificationId": str(notification.id),
    "artifactId": str(artifact.id),
}))
`;
  const { stdout } = await execFileAsync("bash", ["-lc", `source .venv/bin/activate && python backend/manage.py shell -c '${script.replaceAll("'", "'\\''")}'`], {
    cwd: repoRoot,
    maxBuffer: 1024 * 1024,
  });
  return JSON.parse(stdout.trim().split("\n").at(-1) ?? "{}") as CrossTenantFixture;
}

async function expectDeniedWithoutLeak(response: APIResponse) {
  expect([400, 401, 403, 404, 405]).toContain(response.status());
  const body = await response.text().catch(() => "");
  const lowered = body.toLowerCase();
  expect(lowered).not.toContain("phase 7b private");
  expect(lowered).not.toContain("phase7b-private");
  expect(lowered).not.toContain("private.employee.phase7b");
  expect(lowered).not.toContain("secret_marker");
}

test.describe("Phase 7B cross-tenant object isolation", () => {
  test("HR admin browser session cannot read or mutate another tenant's objects", async ({ page }, testInfo) => {
    const fixture = await createCrossTenantFixture();
    expect(fixture.attackerTenantCode).not.toBe(fixture.protectedTenantCode);

    await switchPersona(page, hrAdmin, "/hr-admin/employees");
    await expectPageReady(page, "Employees");
    await expect(page.getByText("P7B-PRIVATE-EMP")).toHaveCount(0);
    await captureIsolationStep(page, testInfo, "01-attacker-employee-directory");

    await expectDeniedWithoutLeak(await page.request.get(`/api/hr-admin/employees/${fixture.employeeId}`));
    await expectDeniedWithoutLeak(await page.request.patch(`/api/hr-admin/employees/${fixture.employeeId}`, {
      data: { preferred_name: "Leaked Update" },
    }));
    await expectDeniedWithoutLeak(await page.request.get(`/api/hr-admin/employees/${fixture.employeeId}/access`));
    await expectDeniedWithoutLeak(await page.request.patch(`/api/hr-admin/employees/${fixture.employeeId}/access`, {
      data: { membership_status: "suspended" },
    }));

    await switchPersona(page, hrAdmin, "/hr-admin/organization?section=departments");
    await expectPageReady(page, "Organization setup review for the structural backbone of the HRMS.");
    await expect(page.getByText("Phase 7B Private Department")).toHaveCount(0);
    await expectDeniedWithoutLeak(await page.request.get(`/api/hr-admin/organization/departments/${fixture.departmentId}`));
    await expectDeniedWithoutLeak(await page.request.patch(`/api/hr-admin/organization/departments/${fixture.departmentId}`, {
      data: { name: "Leaked Department Update" },
    }));
    await captureIsolationStep(page, testInfo, "02-attacker-organization-directory");

    await switchPersona(page, hrAdmin, "/hr-admin/notifications");
    await expectPageReady(page, "Notification queue");
    await expect(page.getByText("Phase 7B Private Notification")).toHaveCount(0);
    await expectDeniedWithoutLeak(await page.request.get(`/api/hr-admin/notifications/${fixture.notificationId}`));
    await expectDeniedWithoutLeak(await page.request.patch(`/api/hr-admin/notifications/${fixture.notificationId}`, {
      data: { status: "read", priority: "low" },
    }));
    await expectDeniedWithoutLeak(await page.request.post(`/api/hr-admin/notifications/${fixture.notificationId}/retry`, {
      data: { process_now: true },
    }));
    const bulkRetry = await page.request.post("/api/hr-admin/notifications/bulk-retry", {
      data: { notification_ids: [fixture.notificationId], process_now: true },
    });
    expect(bulkRetry.ok()).toBeTruthy();
    const bulkPayload = await bulkRetry.json();
    expect(bulkPayload.updated_count).toBe(0);
    expect(JSON.stringify(bulkPayload).toLowerCase()).not.toContain("phase7b-private");
    await captureIsolationStep(page, testInfo, "03-attacker-notification-queue");

    await expectDeniedWithoutLeak(await page.request.get(`/api/hr-admin/payroll-output-artifacts/${fixture.artifactId}/download`));
    await expectDeniedWithoutLeak(await page.request.post(`/api/hr-admin/payroll-output-artifacts/${fixture.artifactId}/signed-access`, {
      data: { expires_in_seconds: 300 },
    }));
    await expectDeniedWithoutLeak(await page.request.get(`/api/hr-admin/payroll-output-artifacts/${fixture.artifactId}/access-audit-export`));

    await expectNoHorizontalOverflow(page);
  });
});
