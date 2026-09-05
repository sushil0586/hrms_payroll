"""Process pending notifications across configured delivery channels."""

from django.core.management.base import BaseCommand, CommandError

from apps.tenants.models import Tenant
from apps.notifications.models import NotificationChannel
from apps.notifications.services import process_pending_notifications


class Command(BaseCommand):
    help = "Processes pending notifications through their configured delivery backends."

    def add_arguments(self, parser):
        parser.add_argument("--tenant-code", dest="tenant_code", help="Limit processing to one tenant code.")
        parser.add_argument(
            "--channel",
            dest="channels",
            action="append",
            choices=NotificationChannel.values,
            help="Limit processing to one or more channels.",
        )
        parser.add_argument("--limit", dest="limit", type=int, default=100, help="Maximum notifications to process.")

    def handle(self, *args, **options):
        tenant = None
        tenant_code = options.get("tenant_code")
        if tenant_code:
            tenant = Tenant.objects.filter(code=tenant_code).first()
            if tenant is None:
                raise CommandError(f"Tenant with code '{tenant_code}' was not found.")

        processed = process_pending_notifications(
            tenant=tenant,
            limit=max(1, options.get("limit") or 100),
            channels=options.get("channels") or None,
        )
        self.stdout.write(self.style.SUCCESS(f"Processed {len(processed)} notification(s)."))
