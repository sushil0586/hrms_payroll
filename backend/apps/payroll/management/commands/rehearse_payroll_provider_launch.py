"""Generate a tenant payroll provider launch-readiness audit pack."""

import json
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from apps.common.api_views import get_hr_admin_payroll_provider_connection_setup_payload_for_tenant
from apps.payroll.providers import PAYROLL_PROVIDER_LAUNCH_READINESS_COMMAND_REF
from apps.payroll.services import record_payroll_provider_launch_rehearsal
from apps.tenants.models import Tenant


class Command(BaseCommand):
    help = "Rehearses tenant payroll provider launch readiness and emits a portable audit pack."

    def add_arguments(self, parser):
        parser.add_argument("--tenant-code", dest="tenant_code", required=True, help="Tenant code to rehearse.")
        parser.add_argument(
            "--output-file",
            dest="output_file",
            help="Optional path where the sanitized launch-readiness audit pack should be written as JSON.",
        )
        parser.add_argument(
            "--allow-blocked",
            dest="allow_blocked",
            action="store_true",
            help="Return success even when the launch rehearsal is blocked.",
        )
        parser.add_argument(
            "--generated-by-ref",
            dest="generated_by_ref",
            default=PAYROLL_PROVIDER_LAUNCH_READINESS_COMMAND_REF,
            help="Identifier recorded in the audit pack evidence.",
        )

    def handle(self, *args, **options):
        tenant_code = (options.get("tenant_code") or "").strip()
        tenant = Tenant.objects.filter(code=tenant_code).first()
        if tenant is None:
            raise CommandError(f"Tenant with code '{tenant_code}' was not found.")

        setup_payload = get_hr_admin_payroll_provider_connection_setup_payload_for_tenant(tenant)
        rehearsal = record_payroll_provider_launch_rehearsal(
            tenant,
            setup_payload=setup_payload,
            generated_at=timezone.now(),
            generated_by_ref=options.get("generated_by_ref") or PAYROLL_PROVIDER_LAUNCH_READINESS_COMMAND_REF,
        )
        audit_pack = rehearsal.audit_pack_snapshot

        output_file = (options.get("output_file") or "").strip()
        if output_file:
            output_path = Path(output_file)
            output_path.parent.mkdir(parents=True, exist_ok=True)
            output_path.write_text(json.dumps(audit_pack, sort_keys=True, indent=2, default=str), encoding="utf-8")

        summary = audit_pack["summary"]
        self.stdout.write(
            "Payroll provider launch rehearsal "
            f"for {tenant.code}: {audit_pack['status']} "
            f"({summary['ready_lane_count']} ready lane(s), "
            f"{summary['blocked_lane_count']} blocked lane(s), "
            f"{summary['launch_blocker_count']} blocker(s))."
        )
        if output_file:
            self.stdout.write(f"Audit pack: {output_file}")
        self.stdout.write(f"Evidence checksum: {audit_pack['evidence_checksum_sha256']}")
        self.stdout.write(f"Rehearsal id: {rehearsal.id}")

        if audit_pack["status"] != "ready" and not options.get("allow_blocked"):
            blocker_refs = ", ".join(item["ref"] for item in audit_pack["release_blockers"][:8])
            raise CommandError(f"Payroll provider launch rehearsal is blocked: {blocker_refs or 'release gate failed'}.")

        self.stdout.write(self.style.SUCCESS("Payroll provider launch rehearsal gate complete."))
