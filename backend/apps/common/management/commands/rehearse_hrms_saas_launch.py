"""Generate a tenant HRMS SaaS launch audit pack."""

import json
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from apps.common.selectors import (
    HRMS_SAAS_LAUNCH_AUDIT_COMMAND_REF,
    describe_hrms_saas_launch_audit_pack,
    recompute_hrms_saas_launch_audit_pack_checksum,
    sync_hrms_saas_launch_remediation_assignments,
)
from apps.tenants.models import Tenant


class Command(BaseCommand):
    help = "Rehearses tenant HRMS SaaS launch readiness and emits a portable audit pack."

    def add_arguments(self, parser):
        parser.add_argument("--tenant-code", dest="tenant_code", required=True, help="Tenant code to rehearse.")
        parser.add_argument(
            "--output-file",
            dest="output_file",
            help="Optional path where the launch audit pack should be written as JSON.",
        )
        parser.add_argument(
            "--allow-blocked",
            dest="allow_blocked",
            action="store_true",
            help="Return success even when the launch audit has blocker gates.",
        )
        parser.add_argument(
            "--strict-warnings",
            dest="strict_warnings",
            action="store_true",
            help="Treat warning gates as release failures for strict production rehearsals.",
        )
        parser.add_argument(
            "--generated-by-ref",
            dest="generated_by_ref",
            default=HRMS_SAAS_LAUNCH_AUDIT_COMMAND_REF,
            help="Identifier recorded in the audit pack evidence.",
        )

    def handle(self, *args, **options):
        tenant_code = (options.get("tenant_code") or "").strip()
        tenant = Tenant.objects.filter(code=tenant_code).first()
        if tenant is None:
            raise CommandError(f"Tenant with code '{tenant_code}' was not found.")

        audit_pack = describe_hrms_saas_launch_audit_pack(
            tenant,
            generated_at=timezone.now(),
            generated_by_ref=options.get("generated_by_ref") or HRMS_SAAS_LAUNCH_AUDIT_COMMAND_REF,
        )
        remediation_summary = sync_hrms_saas_launch_remediation_assignments(tenant, {"release_actions": audit_pack["release_actions"]})
        audit_pack["remediation_assignment_summary"] = {
            "open_count": remediation_summary["open_count"],
            "opened_count": remediation_summary["opened_count"],
            "updated_count": remediation_summary["updated_count"],
            "closed_count": remediation_summary["closed_count"],
        }
        recompute_hrms_saas_launch_audit_pack_checksum(audit_pack)
        output_file = (options.get("output_file") or "").strip()
        if output_file:
            output_path = Path(output_file)
            output_path.parent.mkdir(parents=True, exist_ok=True)
            output_path.write_text(json.dumps(audit_pack, sort_keys=True, indent=2, default=str), encoding="utf-8")

        summary = audit_pack["summary"]
        self.stdout.write(
            "HRMS SaaS launch audit "
            f"for {tenant.code}: {audit_pack['status']} "
            f"({summary['passed_gate_count']}/{summary['gate_count']} gates passed, "
            f"{summary['blocker_count']} blocker(s), "
            f"{summary['warning_count']} warning(s), "
            f"{summary['release_action_count']} action(s))."
        )
        if output_file:
            self.stdout.write(f"Audit pack: {output_file}")
        self.stdout.write(
            "Remediation assignments: "
            f"{remediation_summary['open_count']} open "
            f"({remediation_summary['opened_count']} opened, "
            f"{remediation_summary['updated_count']} updated, "
            f"{remediation_summary['closed_count']} closed)."
        )
        self.stdout.write(f"Evidence checksum: {audit_pack['evidence_checksum_sha256']}")

        strict_failure = options.get("strict_warnings") and audit_pack["status"] != "ready"
        blocked_failure = summary["blocker_count"] > 0
        if (blocked_failure or strict_failure) and not options.get("allow_blocked"):
            failed_refs = audit_pack["release_blocker_refs"] or audit_pack["release_warning_refs"]
            refs = ", ".join(failed_refs[:8])
            raise CommandError(f"HRMS SaaS launch audit is blocked: {refs or 'release gate failed'}.")

        self.stdout.write(self.style.SUCCESS("HRMS SaaS launch audit gate complete."))
