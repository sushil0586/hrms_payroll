"""Send system-driven reminders for expired or expiring employee documents."""

from __future__ import annotations

from datetime import timedelta

from django.core.management.base import BaseCommand
from django.db.models import Q
from django.utils import timezone

from apps.common.api_views import _send_document_expiry_attention_reminder
from apps.documents.models import EmployeeDocument, EmployeeDocumentStatus


class Command(BaseCommand):
    help = "Scans active employee documents and sends expiry-attention reminders."

    def add_arguments(self, parser):
        parser.add_argument(
            "--tenant-code",
            default="",
            help="Optional tenant code filter.",
        )

    def handle(self, *args, **options):
        tenant_code = (options.get("tenant_code") or "").strip()
        today = timezone.localdate()
        queryset = (
            EmployeeDocument.objects.filter(status=EmployeeDocumentStatus.ACTIVE)
            .select_related("tenant", "employee__membership__user", "category")
            .filter(
                Q(expires_on__lt=today)
                | Q(expires_on__lte=today + timedelta(days=30), expires_on__gte=today)
                | Q(category__requires_expiry_date=True, expires_on__isnull=True)
            )
        )
        if tenant_code:
            queryset = queryset.filter(tenant__code=tenant_code)

        processed_count = 0
        reminder_count = 0
        for document in queryset.order_by("tenant__code", "employee__employee_code", "created_at"):
            processed_count += 1
            if _send_document_expiry_attention_reminder(document=document, reminder_source="system_scan"):
                reminder_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Processed {processed_count} document(s); sent {reminder_count} expiry reminder(s)."
            )
        )
