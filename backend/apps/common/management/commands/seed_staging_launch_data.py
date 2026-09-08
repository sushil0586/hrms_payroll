"""Seed disposable staging handles for HRMS/payroll launch sign-off."""

from __future__ import annotations

import json
from datetime import date
from pathlib import Path

from django.core.management import call_command
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from apps.employees.models import Employee
from apps.iam.models import User
from apps.notifications.models import (
    Notification,
    NotificationAudienceType,
    NotificationChannel,
    NotificationDeliveryBackend,
    NotificationDeliveryLog,
    NotificationPriority,
    NotificationStatus,
)
from apps.payroll.models import (
    PayGroup,
    PayGroupAssignment,
    PayGroupStatus,
    PayrollArtifactAccessEvent,
    PayrollArtifactAccessEventType,
    PayrollArtifactSignedAccessGrant,
    PayrollCalculationStatus,
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
    PayrollCalendar,
    PayrollFrequency,
)
from apps.payroll.services import create_payroll_artifact_access_event
from apps.tenants.models import Tenant


SEED_REF = "PW_TEST_STAGING_LAUNCH"
DEFAULT_TENANT_CODE = "northstar-foods"
DEFAULT_EMPLOYEE_CODE = "EMP-0042"
DEFAULT_HR_USERNAME = "nisha.rao"


class Command(BaseCommand):
    help = "Creates or cleans disposable staging records used by live launch-signoff tests."

    def add_arguments(self, parser):
        parser.add_argument("--tenant-code", default=DEFAULT_TENANT_CODE, help="Tenant code to seed.")
        parser.add_argument("--employee-code", default=DEFAULT_EMPLOYEE_CODE, help="Employee code that owns the disposable payslip.")
        parser.add_argument("--password", default="Password@123", help="Password passed to bootstrap_demo_workspace.")
        parser.add_argument("--output-file", default="", help="Optional JSON manifest output path.")
        parser.add_argument("--cleanup", action="store_true", help="Delete this command's disposable records instead of seeding them.")
        parser.add_argument("--skip-bootstrap", action="store_true", help="Do not call bootstrap_demo_workspace before seeding.")

    @transaction.atomic
    def handle(self, *args, **options):
        tenant_code = options["tenant_code"]
        if not options["skip_bootstrap"] and not options["cleanup"]:
            call_command("bootstrap_demo_workspace", password=options["password"], stdout=self.stdout)

        tenant = Tenant.objects.filter(code=tenant_code).first()
        if tenant is None:
            raise CommandError(f"Tenant not found: {tenant_code}")

        cleanup_summary = self._cleanup(tenant)
        if options["cleanup"]:
            manifest = {
                "seed_ref": SEED_REF,
                "tenant_code": tenant.code,
                "action": "cleanup",
                "cleanup": cleanup_summary,
            }
            self._write_manifest(options["output_file"], manifest)
            self.stdout.write(self.style.SUCCESS(f"Cleaned disposable staging launch data for {tenant.code}."))
            return

        employee = Employee.objects.select_related("membership", "membership__user").filter(
            tenant=tenant,
            employee_code=options["employee_code"],
        ).first()
        if employee is None or employee.membership_id is None:
            raise CommandError(f"Employee with active membership was not found: {options['employee_code']}")

        hr_user = User.objects.filter(username=DEFAULT_HR_USERNAME).first()
        payroll_handles = self._seed_published_payslip(tenant=tenant, employee=employee, published_by=hr_user)
        retry_notification = self._seed_retry_notification(tenant=tenant, employee=employee)
        employee_notification = self._seed_employee_notification(tenant=tenant, employee=employee)

        manifest = {
            "seed_ref": SEED_REF,
            "tenant_code": tenant.code,
            "employee_code": employee.employee_code,
            "employee_username": employee.membership.user.username,
            "hr_admin_username": DEFAULT_HR_USERNAME,
            "cleanup": cleanup_summary,
            "handles": {
                "PLAYWRIGHT_LIVE_RETRY_NOTIFICATION_ID": str(retry_notification.id),
                "PLAYWRIGHT_LIVE_EMPLOYEE_NOTIFICATION_ID": str(employee_notification.id),
                "PLAYWRIGHT_LIVE_PAYSLIP_ID": str(payroll_handles["payslip"].id),
            },
            "export": [
                f"export PLAYWRIGHT_LIVE_RETRY_NOTIFICATION_ID={retry_notification.id}",
                f"export PLAYWRIGHT_LIVE_EMPLOYEE_NOTIFICATION_ID={employee_notification.id}",
                f"export PLAYWRIGHT_LIVE_PAYSLIP_ID={payroll_handles['payslip'].id}",
            ],
            "payroll": {
                "calendar_code": payroll_handles["calendar"].code,
                "period_code": payroll_handles["period"].code,
                "pay_group_code": payroll_handles["pay_group"].code,
                "run_code": payroll_handles["payroll_run"].code,
                "output_batch_id": str(payroll_handles["output_batch"].id),
            },
        }
        self._write_manifest(options["output_file"], manifest)

        self.stdout.write(self.style.SUCCESS(f"Seeded disposable staging launch data for {tenant.code}."))
        self.stdout.write(f"PLAYWRIGHT_LIVE_RETRY_NOTIFICATION_ID={retry_notification.id}")
        self.stdout.write(f"PLAYWRIGHT_LIVE_EMPLOYEE_NOTIFICATION_ID={employee_notification.id}")
        self.stdout.write(f"PLAYWRIGHT_LIVE_PAYSLIP_ID={payroll_handles['payslip'].id}")
        if options["output_file"]:
            self.stdout.write(f"Manifest: {options['output_file']}")

    def _cleanup(self, tenant: Tenant) -> dict[str, int]:
        notifications = [item for item in Notification.objects.filter(tenant=tenant) if self._is_seed_payload(item.payload)]
        notification_ids = [item.id for item in notifications]
        deleted_delivery_logs = NotificationDeliveryLog.objects.filter(tenant=tenant, notification_id__in=notification_ids).delete()[0]
        deleted_notifications = Notification.objects.filter(id__in=notification_ids).delete()[0]

        artifacts = [
            item
            for item in PayrollOutputArtifact.objects.filter(tenant=tenant)
            if self._is_seed_payload(item.config_snapshot)
        ]
        artifact_ids = [item.id for item in artifacts]
        deleted_access_grants = PayrollArtifactSignedAccessGrant.objects.filter(tenant=tenant, output_artifact_id__in=artifact_ids).delete()[0]
        deleted_access_events = PayrollArtifactAccessEvent.objects.filter(tenant=tenant, output_artifact_id__in=artifact_ids).delete()[0]
        deleted_artifacts = PayrollOutputArtifact.objects.filter(id__in=artifact_ids).delete()[0]

        run_codes = [f"{SEED_REF.lower().replace('_', '-')}-run"]
        runs = PayrollRun.objects.filter(tenant=tenant, code__in=run_codes)
        run_ids = list(runs.values_list("id", flat=True))
        deleted_batches = PayrollOutputBatch.objects.filter(tenant=tenant, payroll_run_id__in=run_ids).delete()[0]
        deleted_reviews = PayrollRunReview.objects.filter(tenant=tenant, payroll_run_id__in=run_ids).delete()[0]
        deleted_calculations = PayrollRunCalculation.objects.filter(tenant=tenant, payroll_run_id__in=run_ids).delete()[0]
        deleted_snapshots = PayrollInputSnapshot.objects.filter(tenant=tenant, payroll_run_id__in=run_ids).delete()[0]
        deleted_runs = runs.delete()[0]

        deleted_pay_group_assignments = PayGroupAssignment.objects.filter(
            tenant=tenant,
            config_snapshot__seed_ref=SEED_REF,
        ).delete()[0]
        deleted_pay_groups = PayGroup.objects.filter(tenant=tenant, code=f"{SEED_REF.lower().replace('_', '-')}-pay-group").delete()[0]
        deleted_periods = PayrollPeriod.objects.filter(tenant=tenant, code=f"{SEED_REF.lower().replace('_', '-')}-period").delete()[0]
        deleted_calendars = PayrollCalendar.objects.filter(tenant=tenant, code=f"{SEED_REF.lower().replace('_', '-')}-calendar").delete()[0]

        return {
            "notifications": deleted_notifications,
            "notification_delivery_logs": deleted_delivery_logs,
            "payroll_access_grants": deleted_access_grants,
            "payroll_access_events": deleted_access_events,
            "payroll_artifacts": deleted_artifacts,
            "payroll_output_batches": deleted_batches,
            "payroll_reviews": deleted_reviews,
            "payroll_calculations": deleted_calculations,
            "payroll_input_snapshots": deleted_snapshots,
            "payroll_runs": deleted_runs,
            "pay_group_assignments": deleted_pay_group_assignments,
            "pay_groups": deleted_pay_groups,
            "payroll_periods": deleted_periods,
            "payroll_calendars": deleted_calendars,
        }

    def _seed_published_payslip(self, *, tenant: Tenant, employee: Employee, published_by):
        period_start = date(2099, 1, 1)
        period_end = date(2099, 1, 31)
        pay_date = date(2099, 2, 1)
        seed_code = SEED_REF.lower().replace("_", "-")
        seed_payload = {"seed_ref": SEED_REF, "seeded_at": timezone.now().isoformat(), "surface": "staging_launch_signoff"}

        calendar = PayrollCalendar.objects.create(
            tenant=tenant,
            code=f"{seed_code}-calendar",
            name="PW Test Staging Launch Calendar",
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
            name="PW Test Staging Launch Period",
            start_date=period_start,
            end_date=period_end,
            pay_date=pay_date,
            status=PayrollPeriodStatus.CLOSED,
            config_snapshot=seed_payload,
        )
        pay_group = PayGroup.objects.create(
            tenant=tenant,
            calendar=calendar,
            code=f"{seed_code}-pay-group",
            name="PW Test Staging Launch Pay Group",
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
            name="PW Test Staging Launch Payroll Run",
            status=PayrollRunStatus.LOCKED,
            input_profile_ref="pw.test.staging.input.profile.v1",
            snapshot_schema_ref="pw.test.staging.input.snapshot.v1",
            locked_by=published_by,
            final_locked_by=published_by,
            config_snapshot=seed_payload,
        )
        snapshot = PayrollInputSnapshot.objects.create(
            tenant=tenant,
            payroll_run=payroll_run,
            employee=employee,
            snapshot_status=PayrollInputSnapshotStatus.LOCKED,
            period_start=period_start,
            period_end=period_end,
            input_profile_ref="pw.test.staging.input.profile.v1",
            employee_snapshot={
                "employee_code": employee.employee_code,
                "employee_name": str(employee),
                "seed_ref": SEED_REF,
            },
            organization_snapshot={
                "legal_entity": str(employee.legal_entity) if employee.legal_entity_id else "",
                "department": str(employee.department) if employee.department_id else "",
            },
            salary_snapshot={"gross_monthly": "40000.00", "currency_code": "INR"},
            attendance_snapshot={"payable_days": "31.00"},
            leave_snapshot={"loss_of_pay_days": "0.00"},
            banking_snapshot={"payment_mode": "bank_transfer", "bank_account_ref": "PW_TEST_BANK_REF"},
            validation_snapshot={"status": "ready", "blockers": []},
            config_snapshot=seed_payload,
        )
        calculation = PayrollRunCalculation.objects.create(
            tenant=tenant,
            payroll_run=payroll_run,
            attempt_number=1,
            status=PayrollCalculationStatus.COMPLETED,
            calculation_profile_ref="pw.test.staging.calculation.profile.v1",
            calculated_at=timezone.now(),
            calculated_by=published_by,
            totals_snapshot={"gross_earnings": "40000.00", "total_deductions": "11800.00", "net_pay": "28200.00"},
            config_snapshot=seed_payload,
        )
        review = PayrollRunReview.objects.create(
            tenant=tenant,
            payroll_run=payroll_run,
            calculation=calculation,
            status=PayrollReviewStatus.LOCKED,
            review_profile_ref="pw.test.staging.review.profile.v1",
            opened_by=published_by,
            submitted_at=timezone.now(),
            submitted_by=published_by,
            approved_at=timezone.now(),
            approved_by=published_by,
            locked_at=timezone.now(),
            locked_by=published_by,
            totals_snapshot=calculation.totals_snapshot,
            exception_summary_snapshot={"open": 0, "accepted": 0, "resolved": 0},
            approval_snapshot={"status": "approved", "approver": DEFAULT_HR_USERNAME},
            config_snapshot=seed_payload,
        )
        output_batch = PayrollOutputBatch.objects.create(
            tenant=tenant,
            payroll_run=payroll_run,
            review=review,
            status=PayrollOutputBatchStatus.PUBLISHED,
            output_profile_ref="pw.test.staging.output.profile.v1",
            generated_by=published_by,
            published_by=published_by,
            totals_snapshot=calculation.totals_snapshot,
            artifact_summary_snapshot={"payslip_count": 1, "seed_ref": SEED_REF},
            config_snapshot=seed_payload,
        )
        payslip = PayrollOutputArtifact.objects.create(
            tenant=tenant,
            output_batch=output_batch,
            payroll_run=payroll_run,
            review=review,
            employee=employee,
            input_snapshot=snapshot,
            kind=PayrollOutputArtifactKind.PAYSLIP,
            status=PayrollOutputArtifactStatus.PUBLISHED,
            artifact_key=f"{SEED_REF}:payslip:{employee.employee_code}",
            title=f"PW Test Payslip - {employee}",
            file_name=f"pw-test-payslip-{employee.employee_code.lower()}.html",
            content_type="text/html",
            mime_type="text/html",
            storage_provider_ref="payroll.storage.local.generated.v1",
            storage_object_version=f"{SEED_REF.lower()}-v1",
            download_strategy_ref="payroll.download.stream.local.v1",
            retention_policy_ref="payroll.retention.7y.v1",
            output_profile_ref=output_batch.output_profile_ref,
            totals_snapshot=calculation.totals_snapshot,
            line_snapshot=[
                {"component_code": "BASIC", "component_name": "Basic", "amount": "30000.00", "line_type": "earning"},
                {"component_code": "HRA", "component_name": "House Rent Allowance", "amount": "10000.00", "line_type": "earning"},
                {"component_code": "TDS", "component_name": "Tax Deducted at Source", "amount": "11800.00", "line_type": "deduction"},
            ],
            file_payload=self._payslip_payload(employee=employee, period=period),
            published_by=published_by,
            config_snapshot=seed_payload,
        )
        create_payroll_artifact_access_event(
            payslip,
            event_type=PayrollArtifactAccessEventType.PUBLISHED,
            actor_user=published_by,
            actor_identifier=DEFAULT_HR_USERNAME,
            metadata_snapshot={"seed_ref": SEED_REF},
        )
        notification = Notification.objects.create(
            tenant=tenant,
            channel=NotificationChannel.IN_APP,
            audience_type=NotificationAudienceType.EMPLOYEE,
            subject_type="payroll_payslip",
            subject_identifier=str(payslip.id),
            recipient_membership=employee.membership,
            recipient_identifier=employee.membership.user.username,
            title="PW Test payslip available",
            subject="PW Test payslip published",
            body="Disposable staging launch sign-off payslip.",
            status=NotificationStatus.DELIVERED,
            priority=NotificationPriority.NORMAL,
            sent_at=timezone.now(),
            delivered_at=timezone.now(),
            payload={"seed_ref": SEED_REF, "artifact_id": str(payslip.id), "download_path": f"/ess/payslips?payslipId={payslip.id}"},
        )
        create_payroll_artifact_access_event(
            payslip,
            event_type=PayrollArtifactAccessEventType.NOTIFIED,
            actor_user=published_by,
            actor_identifier=DEFAULT_HR_USERNAME,
            notification=notification,
            metadata_snapshot={"seed_ref": SEED_REF, "notification_id": str(notification.id)},
        )
        return {
            "calendar": calendar,
            "period": period,
            "pay_group": pay_group,
            "payroll_run": payroll_run,
            "output_batch": output_batch,
            "payslip": payslip,
        }

    def _seed_retry_notification(self, *, tenant: Tenant, employee: Employee) -> Notification:
        notification = Notification.objects.create(
            tenant=tenant,
            channel=NotificationChannel.IN_APP,
            audience_type=NotificationAudienceType.MEMBERSHIP,
            recipient_membership=employee.membership,
            recipient_identifier=employee.membership.user.username,
            subject_type="pw_test_staging_launch",
            subject_identifier=f"{SEED_REF}:retry-ready",
            title="PW Test retry-ready notification",
            subject="PW Test retry-ready notification",
            body="Disposable failed notification for staging retry mutation checks.",
            status=NotificationStatus.FAILED,
            priority=NotificationPriority.NORMAL,
            payload={"seed_ref": SEED_REF, "purpose": "retry_ready"},
        )
        NotificationDeliveryLog.objects.create(
            tenant=tenant,
            notification=notification,
            channel=notification.channel,
            status=NotificationStatus.FAILED,
            provider_name=NotificationDeliveryBackend.IN_APP_DEFAULT,
            error_message="PW_TEST forced transient failure before staging retry.",
            response_payload={"seed_ref": SEED_REF, "provider_status": "transient_failure"},
        )
        return notification

    def _seed_employee_notification(self, *, tenant: Tenant, employee: Employee) -> Notification:
        return Notification.objects.create(
            tenant=tenant,
            channel=NotificationChannel.IN_APP,
            audience_type=NotificationAudienceType.EMPLOYEE,
            recipient_membership=employee.membership,
            recipient_identifier=employee.membership.user.username,
            subject_type="pw_test_staging_launch",
            subject_identifier=f"{SEED_REF}:employee-notification",
            title="PW Test employee notification",
            subject="",
            body="Disposable employee notification for staging read-state checks.",
            status=NotificationStatus.DELIVERED,
            priority=NotificationPriority.NORMAL,
            sent_at=timezone.now(),
            delivered_at=timezone.now(),
            payload={"seed_ref": SEED_REF, "purpose": "employee_read_state"},
        )

    def _payslip_payload(self, *, employee: Employee, period: PayrollPeriod) -> str:
        return (
            "<!doctype html><html><body>"
            f"<h1>PW Test Payslip</h1><p>{employee.employee_code}</p>"
            f"<p>{employee}</p><p>{period.name}</p><p>Net pay INR 28200.00</p>"
            f"<p>{SEED_REF}</p></body></html>"
        )

    def _is_seed_payload(self, payload) -> bool:
        return isinstance(payload, dict) and payload.get("seed_ref") == SEED_REF

    def _write_manifest(self, output_file: str, manifest: dict) -> None:
        if not output_file:
            return
        output_path = Path(output_file)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(json.dumps(manifest, indent=2, sort_keys=True, default=str), encoding="utf-8")
