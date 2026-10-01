import { execFileSync } from "node:child_process";

import { expect, test, type APIResponse, type Page } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { employee, gotoAuthenticated, hrAdmin } from "../helpers/staging-auth";

type ApiList<T> = {
  items: T[];
  total_count: number;
};

type EmployeeListItem = {
  id: string;
  employee_code: string;
  full_name: string;
  work_email: string;
};

type DocumentCategory = {
  id: string;
  name: string;
};

type EmployeeDocument = {
  id: string;
  title: string;
  employee_code: string;
  category_name: string;
  verification_status: string;
  reupload_requested: boolean;
  expires_on: string | null;
};

type LaunchRemediation = {
  id: string;
  label: string;
  status: string;
  owner_role_ref: string;
  escalation_owner_role_ref: string;
};

type PayrollOutputBatch = {
  id: string;
  status: string;
  status_label: string;
  published_at: string | null;
  payslip_count: number;
};

type PayrollOutputArtifact = {
  id: string;
  title: string;
  employee_code: string;
  employee_email: string;
  status: string;
};

type NotificationItem = {
  id: string;
  event_definition_name: string | null;
  recipient_address: string;
  subject: string;
  title: string;
  body: string;
  status: string;
  subject_type: string;
  subject_identifier: string;
  delivered_at: string | null;
  delivery_logs: Array<{
    status: string;
    provider_name: string;
    error_message: string;
  }>;
};

const shouldMutateStage = process.env.PLAYWRIGHT_OPERATIONAL_EMAIL_MUTATE === "true";
const tenantCode = process.env.PLAYWRIGHT_STAGE_TENANT_CODE ?? "accerio-india";
const stageSshHost = process.env.PLAYWRIGHT_STAGE_SSH_HOST ?? "ubuntu@3.106.125.117";
const stageSshKey = process.env.PLAYWRIGHT_STAGE_SSH_KEY ?? `${process.env.HOME ?? ""}/Downloads/bansalsushil05.pem`;

function uniqueRef(prefix: string) {
  return `PW_EMAIL_${prefix}_${Date.now()}`;
}

async function apiJson<T>(page: Page, path: string): Promise<T> {
  const response = await page.request.get(path);
  await expectResponseOk(response, path);
  return (await response.json()) as T;
}

async function expectResponseOk(response: APIResponse, label: string) {
  const payload = await response.json().catch(() => ({}));
  expect(response.ok(), `${label} failed with ${response.status()}: ${JSON.stringify(payload)}`).toBeTruthy();
}

function findConfiguredEmployee(employees: EmployeeListItem[]) {
  const configuredEmail = employee.username.toLowerCase();
  return employees.find((item) =>
    [item.work_email, item.employee_code, item.full_name].some((value) => {
      const label = value.toLowerCase();
      return label === configuredEmail || label.includes(configuredEmail) || configuredEmail.includes(label);
    }),
  );
}

async function getConfiguredEmployee(page: Page) {
  const employees = await apiJson<EmployeeListItem[]>(page, "/api/hr-admin/employees/");
  const item = findConfiguredEmployee(employees);
  test.skip(!item, `No employee record matched ${employee.username}.`);
  if (!item) {
    throw new Error(`No employee record matched ${employee.username}.`);
  }
  return item;
}

async function ensureUploadableDocumentCategory(page: Page, ref: string) {
  await gotoAuthenticated(page, "/hr-admin/employee-documents", hrAdmin);
  const categoryResponse = await page.request.post("/api/hr-admin/document-categories", {
    data: {
      code: ref.toLowerCase().replaceAll("_", "-").slice(0, 60),
      name: `${ref} Identity Proof`,
      category_type: "other",
      description: "Disposable stage certification document category.",
      is_active: true,
      requires_expiry_date: true,
      requires_verification: true,
      allow_employee_upload: true,
      allow_multiple_files: true,
      visibility_rules: {},
    },
  });
  await expectResponseOk(categoryResponse, "create document category");
  const category = (await categoryResponse.json()) as DocumentCategory;

  const requirementResponse = await page.request.post("/api/hr-admin/document-requirements", {
    data: {
      category_id: category.id,
      is_mandatory: true,
      required_within_days_of_joining: 0,
      priority: 1,
      is_active: true,
    },
  });
  await expectResponseOk(requirementResponse, "create document requirement");
  return category;
}

async function uploadEmployeeDocumentFromEss(page: Page, category: DocumentCategory, title: string) {
  await gotoAuthenticated(page, "/ess/documents", employee);
  await expectPageReady(page, /Documents/i);
  const uploadPanel = page.locator(".ess-documents-upload");
  await expect(uploadPanel).toBeVisible();

  let uploadAttempted = false;
  const uploadWatcher = (response: APIResponse) => {
    if (response.url().includes("/api/me/employee-documents") && response.request().method() === "POST") {
      uploadAttempted = true;
    }
  };
  page.on("response", uploadWatcher);
  await uploadPanel.getByRole("button", { name: "Upload document" }).click();
  await expect(uploadPanel.getByLabel("Title")).toHaveJSProperty("validity.valid", false);
  await page.waitForTimeout(500);
  page.off("response", uploadWatcher);
  expect(uploadAttempted, "Invalid document upload should be blocked before any API call").toBeFalsy();

  await uploadPanel.getByLabel("Category").selectOption(category.id);
  await uploadPanel.getByLabel("Title").fill(title);
  await uploadPanel.getByLabel("Document number").fill(`${title}-DOC`);
  await uploadPanel.getByLabel("Issued on").fill("2026-09-01");
  await uploadPanel.getByLabel("Expires on").fill("2026-09-10");
  await uploadPanel.getByLabel("File").setInputFiles({
    name: `${title}.pdf`,
    mimeType: "application/pdf",
    buffer: Buffer.from(`%PDF-1.4\n% ${title}\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n`),
  });

  const [uploadResponse] = await Promise.all([
    page.waitForResponse((response) => response.url().includes("/api/me/employee-documents") && response.request().method() === "POST"),
    uploadPanel.getByRole("button", { name: "Upload document" }).click(),
  ]);
  await expectResponseOk(uploadResponse, "ESS document upload");
  const uploadedDocument = (await uploadResponse.json()) as EmployeeDocument;
  await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
  await expectNoHorizontalOverflow(page);
  return uploadedDocument;
}

function processStageEmailQueue() {
  if (!stageSshKey || !stageSshHost) {
    return;
  }
  const script = [
    "set -euo pipefail",
    "BASE=/var/www/hrms-payroll-saas",
    "REL=$(readlink -f $BASE/current)",
    "set -a; . $BASE/shared/backend.env; set +a",
    "cd $REL/backend",
    `./.venv/bin/python manage.py process_notifications --tenant-code ${tenantCode} --channel email --limit 100`,
  ].join("\n");
  execFileSync("ssh", ["-i", stageSshKey, "-o", "StrictHostKeyChecking=no", stageSshHost, script], {
    encoding: "utf8",
    stdio: "pipe",
  });
}

function runStagePython(python: string) {
  const script = [
    "set -euo pipefail",
    "BASE=/var/www/hrms-payroll-saas",
    "REL=$(readlink -f $BASE/current)",
    "set -a; . $BASE/shared/backend.env; set +a",
    "cd $REL/backend",
    "./.venv/bin/python manage.py shell <<'PY'",
    python.trim(),
    "PY",
  ].join("\n");
  return execFileSync("ssh", ["-i", stageSshKey, "-o", "StrictHostKeyChecking=no", stageSshHost, script], {
    encoding: "utf8",
    stdio: "pipe",
  }).trim();
}

function queryStageNotifications(subjectType: string, subjectIdentifier: string) {
  const python = `
import json
from apps.notifications.models import Notification
qs = Notification.objects.filter(
    channel="email",
    subject_type=${JSON.stringify(subjectType)},
    subject_identifier=${JSON.stringify(subjectIdentifier)},
).select_related("event_definition").prefetch_related("delivery_logs").order_by("-created_at")
items = []
for item in qs[:100]:
    logs = list(item.delivery_logs.all()[:10])
    items.append({
        "id": str(item.id),
        "event_definition_name": item.event_definition.name if item.event_definition else None,
        "recipient_address": item.recipient_address,
        "subject": item.subject,
        "title": item.title,
        "body": item.body,
        "status": item.status,
        "subject_type": item.subject_type,
        "subject_identifier": item.subject_identifier,
        "delivered_at": item.delivered_at.isoformat() if item.delivered_at else None,
        "payload": item.payload,
        "delivery_logs": [
            {
                "status": log.status,
                "provider_name": log.provider_name,
                "error_message": log.error_message,
            }
            for log in logs
        ],
    })
print(json.dumps({"items": items}, default=str))
`;
  return JSON.parse(runStagePython(python)) as ApiList<NotificationItem>;
}

function queryStageOpenLaunchRemediations() {
  const python = `
import json
from apps.common.models import HrmsLaunchRemediationAssignment
items = []
for item in HrmsLaunchRemediationAssignment.objects.filter(status="open").order_by("severity", "module_ref", "gate_ref")[:20]:
    items.append({
        "id": str(item.id),
        "label": item.label,
        "status": item.status,
        "owner_role_ref": item.owner_role_ref,
        "escalation_owner_role_ref": item.escalation_owner_role_ref,
    })
print(json.dumps({"items": items, "total_count": len(items)}, default=str))
`;
  return JSON.parse(runStagePython(python)) as ApiList<LaunchRemediation>;
}

function queryStagePublishablePayrollBatches() {
  const python = `
import json
from django.db.models import Count, Q
from apps.payroll.models import PayrollOutputArtifactKind, PayrollOutputArtifactStatus, PayrollOutputBatch, PayrollOutputBatchStatus
items = []
qs = (
    PayrollOutputBatch.objects
    .filter(
        tenant__code=${JSON.stringify(tenantCode)},
        status=PayrollOutputBatchStatus.GENERATED,
        published_at__isnull=True,
        review__status="locked",
        payroll_run__status="locked",
    )
    .annotate(
        payslip_count_db=Count(
            "artifacts",
            filter=Q(artifacts__kind=PayrollOutputArtifactKind.PAYSLIP, artifacts__status=PayrollOutputArtifactStatus.GENERATED),
        )
    )
    .filter(payslip_count_db__gt=0)
    .order_by("-created_at")
)
for item in qs[:20]:
    items.append({
        "id": str(item.id),
        "status": item.status,
        "status_label": item.get_status_display(),
        "published_at": item.published_at.isoformat() if item.published_at else None,
        "payslip_count": item.payslip_count_db,
    })
print(json.dumps({"items": items, "total_count": len(items)}, default=str))
`;
  return JSON.parse(runStagePython(python)) as ApiList<PayrollOutputBatch>;
}

function queryStagePayslipArtifacts(outputBatchId: string) {
  const python = `
import json
from apps.payroll.models import PayrollOutputArtifact, PayrollOutputArtifactKind
items = []
for item in PayrollOutputArtifact.objects.filter(output_batch_id=${JSON.stringify(outputBatchId)}, kind=PayrollOutputArtifactKind.PAYSLIP).select_related("employee").order_by("employee__employee_code", "created_at")[:100]:
    items.append({
        "id": str(item.id),
        "title": item.title,
        "employee_code": item.employee.employee_code if item.employee_id else "",
        "employee_email": item.employee.work_email if item.employee_id else "",
        "status": item.status,
    })
print(json.dumps({"items": items, "total_count": len(items)}, default=str))
`;
  return JSON.parse(runStagePython(python)) as ApiList<PayrollOutputArtifact>;
}

function createStageDisposableGeneratedPayslipBatch(employeeEmail: string, ref: string) {
  const python = `
import json
from datetime import date
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from apps.employees.models import Employee
from apps.iam.models import User
from apps.payroll.models import (
    PayGroup,
    PayGroupStatus,
    PayrollCalendar,
    PayrollFrequency,
    PayrollInputSnapshot,
    PayrollInputSnapshotStatus,
    PayrollOutputArtifact,
    PayrollOutputArtifactKind,
    PayrollOutputArtifactStatus,
    PayrollOutputBatch,
    PayrollOutputBatchStatus,
    PayrollPeriod,
    PayrollPeriodStatus,
    PayrollReviewStatus,
    PayrollRun,
    PayrollRunCalculation,
    PayrollRunReview,
    PayrollRunStatus,
    PayrollCalculationStatus,
)
from apps.tenants.models import Tenant

tenant = Tenant.objects.get(code=${JSON.stringify(tenantCode)})
employee = (
    Employee.objects.select_related("membership", "membership__user", "legal_entity", "branch", "location", "department", "employment_type")
    .filter(tenant=tenant)
    .filter(Q(work_email__iexact=${JSON.stringify(employeeEmail)}) | Q(membership__user__username__iexact=${JSON.stringify(employeeEmail)}))
    .first()
)
if employee is None or employee.membership_id is None:
    raise SystemExit("Employee with active membership not found for " + ${JSON.stringify(employeeEmail)})
hr_user = User.objects.filter(username__iexact=${JSON.stringify(hrAdmin.username)}).first()
seed_ref = ${JSON.stringify(ref)}
seed_code = seed_ref.lower().replace("_", "-")[:50]
seed_payload = {"seed_ref": seed_ref, "surface": "stage_operational_email_certification", "seeded_at": timezone.now().isoformat()}
period_start = date(2099, 3, 1)
period_end = date(2099, 3, 31)
pay_date = date(2099, 4, 1)
totals = {"gross_earnings": "40000.00", "total_deductions": "11800.00", "net_pay": "28200.00"}

with transaction.atomic():
    calendar = PayrollCalendar.objects.create(
        tenant=tenant,
        code=f"{seed_code}-cal",
        name=f"{seed_ref} Calendar",
        frequency=PayrollFrequency.MONTHLY,
        timezone=tenant.timezone or "Asia/Kolkata",
        currency_code="INR",
        period_start_day=1,
        is_active=True,
        config_snapshot=seed_payload,
    )
    period = PayrollPeriod.objects.create(
        tenant=tenant,
        calendar=calendar,
        code=f"{seed_code}-period",
        name=f"{seed_ref} Period",
        start_date=period_start,
        end_date=period_end,
        pay_date=pay_date,
        status=PayrollPeriodStatus.CLOSED,
        config_snapshot=seed_payload,
    )
    pay_group = PayGroup.objects.create(
        tenant=tenant,
        calendar=calendar,
        code=f"{seed_code}-grp",
        name=f"{seed_ref} Pay Group",
        status=PayGroupStatus.ACTIVE,
        default_currency_code="INR",
        legal_entity=employee.legal_entity,
        branch=employee.branch,
        location=employee.location,
        department=employee.department,
        employment_type=employee.employment_type,
        config_snapshot=seed_payload,
    )
    payroll_run = PayrollRun.objects.create(
        tenant=tenant,
        period=period,
        pay_group=pay_group,
        code=f"{seed_code}-run",
        name=f"{seed_ref} Payroll Run",
        status=PayrollRunStatus.LOCKED,
        input_profile_ref="pw.email.input.profile.v1",
        snapshot_schema_ref="pw.email.input.snapshot.v1",
        locked_at=timezone.now(),
        locked_by=hr_user,
        final_locked_at=timezone.now(),
        final_locked_by=hr_user,
        config_snapshot=seed_payload,
    )
    snapshot = PayrollInputSnapshot.objects.create(
        tenant=tenant,
        payroll_run=payroll_run,
        employee=employee,
        snapshot_status=PayrollInputSnapshotStatus.LOCKED,
        period_start=period_start,
        period_end=period_end,
        input_profile_ref="pw.email.input.profile.v1",
        employee_snapshot={"employee_code": employee.employee_code, "employee_name": str(employee), "seed_ref": seed_ref},
        organization_snapshot={"department": str(employee.department) if employee.department_id else ""},
        salary_snapshot={"gross_monthly": "40000.00", "currency_code": "INR"},
        attendance_snapshot={"payable_days": "31.00"},
        leave_snapshot={"loss_of_pay_days": "0.00"},
        banking_snapshot={"payment_mode": "bank_transfer"},
        validation_snapshot={"status": "ready", "blockers": []},
        config_snapshot=seed_payload,
    )
    calculation = PayrollRunCalculation.objects.create(
        tenant=tenant,
        payroll_run=payroll_run,
        attempt_number=1,
        status=PayrollCalculationStatus.COMPLETED,
        calculation_profile_ref="pw.email.calculation.profile.v1",
        calculated_at=timezone.now(),
        calculated_by=hr_user,
        totals_snapshot=totals,
        config_snapshot=seed_payload,
    )
    review = PayrollRunReview.objects.create(
        tenant=tenant,
        payroll_run=payroll_run,
        calculation=calculation,
        status=PayrollReviewStatus.LOCKED,
        review_profile_ref="pw.email.review.profile.v1",
        opened_by=hr_user,
        submitted_at=timezone.now(),
        submitted_by=hr_user,
        approved_at=timezone.now(),
        approved_by=hr_user,
        locked_at=timezone.now(),
        locked_by=hr_user,
        totals_snapshot=totals,
        exception_summary_snapshot={"open": 0, "accepted": 0, "resolved": 0},
        approval_snapshot={"status": "approved", "approver": ${JSON.stringify(hrAdmin.username)}},
        config_snapshot=seed_payload,
    )
    batch = PayrollOutputBatch.objects.create(
        tenant=tenant,
        payroll_run=payroll_run,
        review=review,
        status=PayrollOutputBatchStatus.GENERATED,
        output_profile_ref="pw.email.output.profile.v1",
        generated_at=timezone.now(),
        generated_by=hr_user,
        totals_snapshot=totals,
        artifact_summary_snapshot={"payslip_count": 1, "seed_ref": seed_ref},
        config_snapshot=seed_payload,
    )
    payslip = PayrollOutputArtifact.objects.create(
        tenant=tenant,
        output_batch=batch,
        payroll_run=payroll_run,
        review=review,
        employee=employee,
        input_snapshot=snapshot,
        kind=PayrollOutputArtifactKind.PAYSLIP,
        status=PayrollOutputArtifactStatus.GENERATED,
        artifact_key=f"{seed_ref}:payslip:{employee.employee_code}",
        title=f"{seed_ref} Payslip - {employee}",
        file_name=f"{seed_code}-{employee.employee_code.lower()}-payslip.html",
        content_type="text/html",
        mime_type="text/html",
        storage_provider_ref="payroll.storage.local.generated.v1",
        storage_object_version=f"{seed_code}-v1",
        download_strategy_ref="payroll.download.stream.local.v1",
        retention_policy_ref="payroll.retention.7y.v1",
        output_profile_ref=batch.output_profile_ref,
        totals_snapshot=totals,
        line_snapshot=[
            {"component_code": "BASIC", "component_name": "Basic", "amount": "30000.00", "line_type": "earning"},
            {"component_code": "HRA", "component_name": "House Rent Allowance", "amount": "10000.00", "line_type": "earning"},
            {"component_code": "TDS", "component_name": "Tax Deducted at Source", "amount": "11800.00", "line_type": "deduction"},
        ],
        file_payload=f"<html><body><h1>{seed_ref} Payslip</h1><p>{employee}</p><p>Net pay INR 28,200.00</p></body></html>",
        config_snapshot=seed_payload,
    )
print(json.dumps({
    "id": str(batch.id),
    "status": batch.status,
    "status_label": batch.get_status_display(),
    "published_at": batch.published_at.isoformat() if batch.published_at else None,
    "payslip_count": 1,
    "artifact_id": str(payslip.id),
    "employee_email": employee.work_email or (employee.membership.user.username if employee.membership_id and employee.membership.user_id else ""),
}, default=str))
`;
  return JSON.parse(runStagePython(python)) as PayrollOutputBatch & { artifact_id: string; employee_email: string };
}

async function pollNotifications(page: Page, subjectType: string, subjectIdentifier: string, expectedCount: number) {
  let latest: ApiList<NotificationItem> | null = null;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    latest = queryStageNotifications(subjectType, subjectIdentifier);
    if (latest.items.length >= expectedCount && latest.items.every((item) => item.status === "delivered")) {
      return latest.items;
    }
    if (attempt === 1 || attempt === 4) {
      processStageEmailQueue();
    }
    await page.waitForTimeout(5_000);
  }
  return latest?.items ?? [];
}

async function expectDeliveredEmail(page: Page, options: {
  eventName: RegExp;
  subjectType: string;
  query: string;
  recipient?: string;
  expectedCount?: number;
}) {
  const items = await pollNotifications(page, options.subjectType, options.query, options.expectedCount ?? 1);
  const matching = items.filter((item) => {
    const eventMatches = options.eventName.test(item.event_definition_name ?? "");
    const recipientMatches = options.recipient ? item.recipient_address.toLowerCase() === options.recipient.toLowerCase() : true;
    return eventMatches && recipientMatches && item.status === "delivered";
  });
  expect(
    matching.length,
    `No delivered email matched ${options.eventName} / ${options.query}. Found: ${JSON.stringify(items)}`,
  ).toBeGreaterThanOrEqual(options.expectedCount ?? 1);
  for (const item of matching) {
    expect(item.delivery_logs[0]?.provider_name ?? "").toContain("email");
    expect(item.delivery_logs[0]?.error_message ?? "").toBe("");
  }
  return matching;
}

test.describe("Stage operational email workflow certification", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(() => {
    test.skip(!shouldMutateStage, "Set PLAYWRIGHT_OPERATIONAL_EMAIL_MUTATE=true to send real stage workflow emails.");
  });

  test("document upload, reupload request, expiry reminder, and launch escalation emails are delivered", async ({ page }) => {
    test.setTimeout(6 * 60 * 1000);
    await page.setViewportSize({ width: 1440, height: 960 });

    const ref = uniqueRef("DOC");
    const documentTitle = `${ref} Stage Proof`;
    await gotoAuthenticated(page, "/hr-admin/employee-documents", hrAdmin);
    const stageEmployee = await getConfiguredEmployee(page);
    const category = await ensureUploadableDocumentCategory(page, ref);

    const document = await uploadEmployeeDocumentFromEss(page, category, documentTitle);

    await gotoAuthenticated(page, `/hr-admin/employee-documents?q=${encodeURIComponent(documentTitle)}`, hrAdmin);
    await expectPageReady(page, /Employee document review/i);
    await expect(page.getByText(documentTitle).first()).toBeVisible({ timeout: 20_000 });

    await expectDeliveredEmail(page, {
      eventName: /Employee Document Upload Submitted Email/i,
      subjectType: "employee_document",
      query: document.id,
      expectedCount: 1,
    });

    const reuploadResponse = await page.request.patch(`/api/hr-admin/employee-documents/${document.id}`, {
      data: {
        verification_status: "rejected",
        rejection_reason: `${ref} reupload required for stage certification`,
        reupload_requested: true,
      },
    });
    await expectResponseOk(reuploadResponse, "request document reupload");
    const reuploadPayload = (await reuploadResponse.json()) as EmployeeDocument;
    expect(reuploadPayload.reupload_requested).toBeTruthy();

    await expectDeliveredEmail(page, {
      eventName: /Employee Document Re-upload Requested Email/i,
      subjectType: "employee_document",
      query: document.id,
      recipient: employee.username,
      expectedCount: 1,
    });

    const reminderResponse = await page.request.post("/api/hr-admin/employee-documents/reminders", {
      data: { document_ids: [document.id] },
    });
    await expectResponseOk(reminderResponse, "send document expiry reminder");
    const reminderPayload = (await reminderResponse.json()) as { processed_count: number; reminder_count: number };
    expect(reminderPayload.processed_count).toBe(1);
    expect(reminderPayload.reminder_count).toBeGreaterThanOrEqual(1);

    await expectDeliveredEmail(page, {
      eventName: /Employee Document Expiry Attention Email/i,
      subjectType: "employee_document",
      query: document.id,
      recipient: employee.username,
      expectedCount: 1,
    });

    const invalidReminderResponse = await page.request.post("/api/hr-admin/employee-documents/reminders", {
      data: { document_ids: [] },
    });
    expect(invalidReminderResponse.status()).toBe(400);

    await gotoAuthenticated(page, "/hr-admin/launch-remediation", hrAdmin);
    await expectPageReady(page, /Launch Blockers/i);
    const launchList = queryStageOpenLaunchRemediations();
    test.skip(!launchList.items.length, "No open launch remediation assignments are available on stage.");
    const assignment = launchList.items.find((item) => item.owner_role_ref === "hr-admin") ?? launchList.items[0];

    const invalidEscalation = await page.request.patch(`/api/hr-admin/launch-remediations/${assignment.id}`, {
      data: { action: "escalate", owner_role_ref: "", escalation_owner_role_ref: "" },
    });
    expect(invalidEscalation.status()).toBe(400);

    const reminderNote = `${ref} launch reminder for ${stageEmployee.employee_code}`;
    const reminderAction = await page.request.patch(`/api/hr-admin/launch-remediations/${assignment.id}`, {
      data: {
        action: "send_reminder",
        owner_role_ref: assignment.owner_role_ref || "hr-admin",
        escalation_owner_role_ref: assignment.escalation_owner_role_ref || assignment.owner_role_ref || "hr-admin",
        resolution_note: reminderNote,
      },
    });
    await expectResponseOk(reminderAction, "send launch remediation reminder");

    await expectDeliveredEmail(page, {
      eventName: /Launch Remediation Reminder Email/i,
      subjectType: "hrms_launch_remediation_assignment",
      query: assignment.id,
      expectedCount: 1,
    });

    const escalationNote = `${ref} launch escalation for ${stageEmployee.employee_code}`;
    const escalationAction = await page.request.patch(`/api/hr-admin/launch-remediations/${assignment.id}`, {
      data: {
        action: "escalate",
        owner_role_ref: "hr-admin",
        escalation_owner_role_ref: "hr-admin",
        resolution_note: escalationNote,
      },
    });
    await expectResponseOk(escalationAction, "escalate launch remediation");

    await expectDeliveredEmail(page, {
      eventName: /Launch Remediation Escalation Email/i,
      subjectType: "hrms_launch_remediation_assignment",
      query: assignment.id,
      expectedCount: 1,
    });
  });

  test("payslip publication email is delivered when a generated unpublished batch is available", async ({ page }) => {
    test.setTimeout(4 * 60 * 1000);
    await page.setViewportSize({ width: 1440, height: 960 });

    await gotoAuthenticated(page, "/hr-admin/payroll-outputs", hrAdmin);
    await expectPageReady(page, /Payroll Outputs/i);
    await expectNoHorizontalOverflow(page);

    const publishableBatches = queryStagePublishablePayrollBatches();
    const batch = publishableBatches.items[0] ?? createStageDisposableGeneratedPayslipBatch(employee.username, uniqueRef("PAYSLIP"));

    const publishResponse = await page.request.post(`/api/hr-admin/payroll-output-batches/${batch.id}/publish`, {
      data: {},
    });
    await expectResponseOk(publishResponse, "publish payroll outputs");

    const artifacts = queryStagePayslipArtifacts(batch.id);
    const payslip = artifacts.items[0];
    expect(payslip, `Published batch ${batch.id} should have at least one payslip artifact`).toBeTruthy();

    await expectDeliveredEmail(page, {
      eventName: /Payslip Published Email/i,
      subjectType: "payroll_payslip",
      query: payslip.id,
      expectedCount: 1,
    });
  });
});
