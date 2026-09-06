"""Process due payroll provider retry events."""

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from apps.payroll.services import process_due_payroll_provider_retries
from apps.tenants.models import Tenant


class Command(BaseCommand):
    help = "Processes due payroll provider retry events through the configured adapter shell."

    def add_arguments(self, parser):
        parser.add_argument("--tenant-code", dest="tenant_code", help="Limit processing to one tenant code.")
        parser.add_argument("--limit", dest="limit", type=int, default=100, help="Maximum retry events to process.")

    def handle(self, *args, **options):
        tenant = None
        tenant_code = (options.get("tenant_code") or "").strip()
        if tenant_code:
            tenant = Tenant.objects.filter(code=tenant_code).first()
            if tenant is None:
                raise CommandError(f"Tenant with code '{tenant_code}' was not found.")

        result = process_due_payroll_provider_retries(
            tenant=tenant,
            limit=max(1, options.get("limit") or 100),
            now=timezone.now(),
        )
        self.stdout.write(
            self.style.SUCCESS(
                "Processed "
                f"{len(result.processed_events)} payroll provider retry event(s): "
                f"{result.executed_count} executed, {result.skipped_count} skipped."
            )
        )
