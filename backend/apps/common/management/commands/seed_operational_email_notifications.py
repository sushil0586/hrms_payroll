"""Seed launch-ready operational email notification templates and events."""

from __future__ import annotations

from dataclasses import dataclass

from django.core.management.base import BaseCommand, CommandError

from apps.notifications.models import (
    NotificationAudienceType,
    NotificationChannel,
    NotificationEventDefinition,
    NotificationPriority,
    NotificationTemplate,
    NotificationTemplateStatus,
)
from apps.tenants.models import Tenant, TenantStatus
from apps.workflows.models import WorkflowModule


@dataclass(frozen=True, slots=True)
class EmailEventSeed:
    code: str
    name: str
    module: str
    trigger_key: str
    audience_type: str
    priority: str
    subject: str
    title: str
    body: str


EMAIL_EVENT_SEEDS = [
    EmailEventSeed(
        code="email-leave-manager-pending",
        name="Leave Pending For Manager Email",
        module=WorkflowModule.LEAVE,
        trigger_key="leave.request.manager_pending",
        audience_type=NotificationAudienceType.MANAGER,
        priority=NotificationPriority.NORMAL,
        subject="Leave request pending approval",
        title="Leave request pending approval",
        body="A team member has submitted a leave request that needs your review. Open MSS to approve or reject it.",
    ),
    EmailEventSeed(
        code="email-leave-employee-updated",
        name="Leave Decision For Employee Email",
        module=WorkflowModule.LEAVE,
        trigger_key="leave.request.employee_updated",
        audience_type=NotificationAudienceType.EMPLOYEE,
        priority=NotificationPriority.NORMAL,
        subject="Leave request updated",
        title="Leave request updated",
        body="Your leave request status has changed. Open ESS to review the latest decision and comments.",
    ),
    EmailEventSeed(
        code="email-attendance-manager-pending",
        name="Attendance Regularization Pending Email",
        module=WorkflowModule.ATTENDANCE,
        trigger_key="attendance.regularization.manager_pending",
        audience_type=NotificationAudienceType.MANAGER,
        priority=NotificationPriority.NORMAL,
        subject="Attendance regularization pending approval",
        title="Attendance regularization pending approval",
        body="A team member has submitted an attendance regularization request. Open MSS to review the correction.",
    ),
    EmailEventSeed(
        code="email-attendance-employee-updated",
        name="Attendance Decision For Employee Email",
        module=WorkflowModule.ATTENDANCE,
        trigger_key="attendance.regularization.employee_updated",
        audience_type=NotificationAudienceType.EMPLOYEE,
        priority=NotificationPriority.NORMAL,
        subject="Attendance regularization updated",
        title="Attendance regularization updated",
        body="Your attendance regularization request has been updated. Open ESS to review the final status.",
    ),
    EmailEventSeed(
        code="email-documents-onboarding-attention",
        name="Onboarding Document Attention Email",
        module=WorkflowModule.DOCUMENTS,
        trigger_key="documents.onboarding.attention_required",
        audience_type=NotificationAudienceType.MEMBERSHIP,
        priority=NotificationPriority.HIGH,
        subject="Onboarding document attention needed",
        title="Onboarding document attention needed",
        body="An onboarding record has missing or blocking document items. Open HR Admin Documents to complete the review.",
    ),
    EmailEventSeed(
        code="email-documents-upload-submitted",
        name="Employee Document Upload Submitted Email",
        module=WorkflowModule.DOCUMENTS,
        trigger_key="documents.employee.upload_submitted",
        audience_type=NotificationAudienceType.MEMBERSHIP,
        priority=NotificationPriority.NORMAL,
        subject="Employee document uploaded for review",
        title="Employee document uploaded for review",
        body="An employee uploaded a document that is ready for HR review. Open HR Admin Documents to verify it.",
    ),
    EmailEventSeed(
        code="email-documents-reupload-requested",
        name="Employee Document Re-upload Requested Email",
        module=WorkflowModule.DOCUMENTS,
        trigger_key="documents.employee.reupload_requested",
        audience_type=NotificationAudienceType.EMPLOYEE,
        priority=NotificationPriority.HIGH,
        subject="Document re-upload requested",
        title="Document re-upload requested",
        body="HR has requested a fresh copy of one of your documents. Open ESS Documents and upload the corrected file.",
    ),
    EmailEventSeed(
        code="email-documents-expiry-attention",
        name="Employee Document Expiry Attention Email",
        module=WorkflowModule.DOCUMENTS,
        trigger_key="documents.employee.expiry_attention",
        audience_type=NotificationAudienceType.EMPLOYEE,
        priority=NotificationPriority.HIGH,
        subject="Document expiry attention needed",
        title="Document expiry attention needed",
        body="One of your employee documents is expired, expiring soon, or missing expiry details. Open ESS Documents to update it.",
    ),
    EmailEventSeed(
        code="email-payroll-payslip-published",
        name="Payslip Published Email",
        module=WorkflowModule.PAYROLL,
        trigger_key="payroll_payslip_published",
        audience_type=NotificationAudienceType.EMPLOYEE,
        priority=NotificationPriority.NORMAL,
        subject="Payslip published",
        title="Payslip published",
        body="Your payroll payslip has been published and is available in ESS Payslips.",
    ),
    EmailEventSeed(
        code="email-launch-remediation-reminder",
        name="Launch Remediation Reminder Email",
        module="saas_operations",
        trigger_key="hrms.launch_remediation.reminder",
        audience_type=NotificationAudienceType.ROLE,
        priority=NotificationPriority.HIGH,
        subject="Launch remediation reminder",
        title="Launch remediation reminder",
        body="A launch readiness item assigned to your role needs attention. Open Launch Readiness to review the owner, due date, and evidence.",
    ),
    EmailEventSeed(
        code="email-launch-remediation-escalated",
        name="Launch Remediation Escalation Email",
        module="saas_operations",
        trigger_key="hrms.launch_remediation.escalated",
        audience_type=NotificationAudienceType.ROLE,
        priority=NotificationPriority.CRITICAL,
        subject="Launch remediation escalated",
        title="Launch remediation escalated",
        body="A launch readiness item has been escalated to your role. Open Launch Readiness and record the resolution evidence.",
    ),
]


class Command(BaseCommand):
    help = "Seeds tenant-scoped email notification templates and event definitions for operational HRMS workflows."

    def add_arguments(self, parser):
        parser.add_argument("--tenant-code", default="", help="Seed one tenant. Defaults to all active tenants.")

    def handle(self, *args, **options):
        tenant_code = (options.get("tenant_code") or "").strip()
        tenants = Tenant.objects.filter(status=TenantStatus.ACTIVE)
        if tenant_code:
            tenants = tenants.filter(code=tenant_code)
        tenants = list(tenants.order_by("code"))
        if not tenants:
            raise CommandError(f"No active tenant found{f' for {tenant_code}' if tenant_code else ''}.")

        total_templates = 0
        total_events = 0
        for tenant in tenants:
            templates_created, events_created = self._seed_tenant(tenant)
            total_templates += templates_created
            total_events += events_created
            self.stdout.write(
                f"Seeded operational email notifications for {tenant.code}: "
                f"{templates_created} templates, {events_created} events."
            )

        self.stdout.write(
            self.style.SUCCESS(
                f"Operational email notification catalog ready: {total_templates} templates, {total_events} events."
            )
        )

    def _seed_tenant(self, tenant: Tenant) -> tuple[int, int]:
        templates_created = 0
        events_created = 0
        for seed in EMAIL_EVENT_SEEDS:
            template, template_created = NotificationTemplate.objects.update_or_create(
                tenant=tenant,
                code=seed.code,
                channel=NotificationChannel.EMAIL,
                defaults={
                    "name": seed.name,
                    "status": NotificationTemplateStatus.ACTIVE,
                    "subject_template": seed.subject,
                    "title_template": seed.title,
                    "body_template": seed.body,
                    "metadata_template": {},
                    "is_system_seeded": True,
                },
            )
            if template_created:
                templates_created += 1

            _, event_created = NotificationEventDefinition.objects.update_or_create(
                tenant=tenant,
                code=seed.code,
                defaults={
                    "name": seed.name,
                    "module": seed.module,
                    "trigger_key": seed.trigger_key,
                    "audience_type": seed.audience_type,
                    "channel": NotificationChannel.EMAIL,
                    "template": template,
                    "role": None,
                    "membership": None,
                    "is_active": True,
                    "priority": seed.priority,
                    "delivery_delay_minutes": 0,
                    "recipient_snapshot": {"seed_ref": "operational_email_notifications.v1"},
                },
            )
            if event_created:
                events_created += 1
        return templates_created, events_created
