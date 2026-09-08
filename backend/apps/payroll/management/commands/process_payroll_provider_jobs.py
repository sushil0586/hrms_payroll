"""Process due generic payroll provider jobs."""

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from apps.payroll.services import process_due_payroll_provider_jobs
from apps.tenants.models import Tenant


class Command(BaseCommand):
    help = "Processes due payroll provider jobs through the portable provider queue ledger."

    def add_arguments(self, parser):
        parser.add_argument("--tenant-code", dest="tenant_code", help="Limit processing to one tenant code.")
        parser.add_argument("--limit", dest="limit", type=int, default=100, help="Maximum provider jobs to process.")
        parser.add_argument(
            "--lease-owner-ref",
            dest="lease_owner_ref",
            default="payroll.provider_worker.management_command.v1",
            help="Worker identity recorded on leased jobs.",
        )

    def handle(self, *args, **options):
        tenant = None
        tenant_code = (options.get("tenant_code") or "").strip()
        if tenant_code:
            tenant = Tenant.objects.filter(code=tenant_code).first()
            if tenant is None:
                raise CommandError(f"Tenant with code '{tenant_code}' was not found.")

        result = process_due_payroll_provider_jobs(
            tenant=tenant,
            limit=max(1, options.get("limit") or 100),
            now=timezone.now(),
            lease_owner_ref=options.get("lease_owner_ref") or "payroll.provider_worker.management_command.v1",
        )
        self.stdout.write(
            self.style.SUCCESS(
                "Processed "
                f"{len(result.processed_jobs)} payroll provider job(s): "
                f"{result.completed_count} completed, "
                f"{result.failed_count} failed, "
                f"{result.skipped_count} skipped, "
                f"{result.dead_lettered_count} dead-lettered, "
                f"{result.recovered_count} recovered."
            )
        )
