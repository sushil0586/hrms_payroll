"""Owned worker controls for the Leave auto-approval browser contract."""

import json
import os
import sys
from datetime import timedelta
from pathlib import Path


def _balance_payload(balance):
    balance.refresh_from_db()
    return {
        "closing": str(balance.closing_balance),
        "consumed": str(balance.consumed_amount),
        "reserved": str(balance.reserved_amount),
    }


def run(manifest_path: str, action: str, request_id: str | None = None) -> dict:
    from django.apps import apps
    from django.utils import timezone

    from apps.leave_management.auto_approval import process_due_leave_auto_approvals

    database = os.environ.get("POSTGRES_DB", "")
    host = os.environ.get("POSTGRES_HOST", "")
    if not database.startswith("hrms_") or host not in {"127.0.0.1", "localhost"}:
        raise RuntimeError("Leave worker fixtures require an explicitly named local PostgreSQL database.")

    manifest = json.loads(Path(manifest_path).read_text(encoding="utf-8"))
    tenant = apps.get_model("tenants.Tenant").objects.get(pk=manifest["tenant"]["id"])
    if not tenant.is_sandbox or not tenant.code.startswith("pw-qa-") or manifest.get("ownership", {}).get("owner") != "playwright":
        raise RuntimeError("Refusing to operate on a workspace that is not Playwright-owned and synthetic.")

    Balance = apps.get_model("leave_management.LeaveBalance")
    Request = apps.get_model("leave_management.LeaveRequest")
    Step = apps.get_model("workflows.WorkflowStepInstance")
    balance = Balance.objects.get(pk=manifest["leave"]["balance_id"], tenant=tenant)

    if action == "snapshot":
        return {"balance": _balance_payload(balance)}
    if action not in {"process", "expire"} or not request_id:
        raise ValueError("Expected snapshot, process <request-id>, or expire <request-id>.")

    request = Request.objects.get(pk=request_id, tenant=tenant)
    if action == "expire":
        step = Step.objects.get(
            workflow_instance_id=request.workflow_reference,
            workflow_instance__tenant=tenant,
            step_order=apps.get_model("workflows.WorkflowInstance").objects.get(pk=request.workflow_reference).current_step_order,
            status="pending",
        )
        started_at = timezone.now() - timedelta(hours=72, seconds=1)
        step.started_at = started_at
        step.due_at = started_at + timedelta(hours=72)
        step.save(update_fields=["started_at", "due_at", "updated_at"])

    processor = process_due_leave_auto_approvals(limit=100)
    request.refresh_from_db()
    return {
        "processor": processor,
        "request": {
            "id": str(request.pk),
            "status": request.status,
            "automatic_approvals": (request.metadata or {}).get("automatic_approvals", []),
        },
        "balance": _balance_payload(balance),
    }


if __name__ == "__main__":
    if len(sys.argv) not in {3, 4}:
        raise SystemExit("Usage: leave_policy_auto_approval.py <workspace-manifest> <snapshot|process|expire> [request-id]")

    backend_root = Path(__file__).resolve().parents[2]
    if str(backend_root) not in sys.path:
        sys.path.insert(0, str(backend_root))
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.base")

    import django

    django.setup()
    print(json.dumps(run(sys.argv[1], sys.argv[2], sys.argv[3] if len(sys.argv) == 4 else None)))
