"""Record SaaS commercial usage meter snapshots."""

from django.core.management.base import BaseCommand, CommandError

from apps.common.selectors import snapshot_saas_commercial_usage
from apps.tenants.models import Tenant


class Command(BaseCommand):
    help = "Persist SaaS commercial usage meter snapshots for one tenant or all tenants."

    def add_arguments(self, parser):
        parser.add_argument("--tenant-code", dest="tenant_code", default="", help="Tenant code to snapshot. Omit to process all tenants.")
        parser.add_argument("--source-ref", dest="source_ref", default="saas.commercial_control.management_command.v1", help="Evidence source ref for created snapshots.")

    def handle(self, *args, **options):
        tenant_code = options["tenant_code"]
        tenant = None
        if tenant_code:
            tenant = Tenant.objects.filter(code=tenant_code).first()
            if not tenant:
                raise CommandError(f"Tenant not found: {tenant_code}")
        result = snapshot_saas_commercial_usage(
            tenant,
            source_ref=options["source_ref"],
            actor_identifier="management_command",
        )
        self.stdout.write(self.style.SUCCESS(f"Recorded {result['snapshot_count']} SaaS usage snapshots across {result['tenant_count']} tenant(s)."))
