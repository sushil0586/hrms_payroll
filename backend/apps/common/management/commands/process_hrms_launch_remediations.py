"""Process HRMS SaaS launch remediation SLA reminders and escalations."""

from django.core.management.base import BaseCommand, CommandError

from apps.common.selectors import process_hrms_saas_launch_remediation_sla
from apps.tenants.models import Tenant


class Command(BaseCommand):
    help = "Sends due-soon reminders and overdue escalations for HRMS SaaS launch remediation assignments."

    def add_arguments(self, parser):
        parser.add_argument("--tenant-code", dest="tenant_code", default="", help="Optional tenant code to process.")
        parser.add_argument("--reminder-window-hours", dest="reminder_window_hours", type=int, default=24)
        parser.add_argument("--reminder-cooldown-hours", dest="reminder_cooldown_hours", type=int, default=24)
        parser.add_argument("--escalation-owner-role-ref", dest="escalation_owner_role_ref", default="")

    def handle(self, *args, **options):
        tenant_code = options["tenant_code"]
        tenants = Tenant.objects.all().order_by("code")
        if tenant_code:
            tenants = tenants.filter(code=tenant_code)
            if not tenants.exists():
                raise CommandError(f"Tenant with code {tenant_code!r} was not found.")

        processed_count = 0
        reminded_count = 0
        escalated_count = 0
        for tenant in tenants:
            result = process_hrms_saas_launch_remediation_sla(
                tenant,
                reminder_window_hours=options["reminder_window_hours"],
                reminder_cooldown_hours=options["reminder_cooldown_hours"],
                escalation_owner_role_ref=options["escalation_owner_role_ref"],
            )
            processed_count += 1
            reminded_count += result["reminded_count"]
            escalated_count += result["escalated_count"]
            self.stdout.write(
                f"{tenant.code}: {result['reminded_count']} reminded, "
                f"{result['escalated_count']} escalated, {result['open_count']} open."
            )

        self.stdout.write(
            self.style.SUCCESS(
                f"Processed {processed_count} tenant(s): {reminded_count} reminders, {escalated_count} escalations."
            )
        )
