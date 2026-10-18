from contextlib import redirect_stdout
from datetime import date, timedelta
from io import StringIO

import pytest
from celery.exceptions import Retry
from django.core.exceptions import PermissionDenied
from django.core.management import call_command
from django.contrib.auth import get_user_model
from django.db import DatabaseError, connection, transaction
from django.utils import timezone
from rest_framework.test import APIClient

from apps.organizations.models import LegalEntity
from apps.tenants.governance import (
    approve_governance_request,
    create_governance_request,
    execute_governance_request,
    place_legal_hold,
    release_legal_hold,
    retention_preview,
)
from apps.tenants.models import (
    DataGovernanceRequest,
    DataGovernanceEvent,
    GovernanceRequestStatus,
    GovernanceRequestType,
    LegalHoldStatus,
    RetentionPolicy,
    RetentionPolicyStatus,
    Tenant,
)
from apps.tenants.tasks import execute_data_governance_request_task


def provision(seed_ref):
    with redirect_stdout(StringIO()):
        call_command("manage_playwright_workspace", seed_ref=seed_ref)
    return Tenant.objects.get(code=f"pw-qa-{seed_ref}")


@pytest.fixture
def governance_workspace(db):
    if connection.vendor != "postgresql":
        pytest.skip("DB-4B integrity verification requires PostgreSQL.")
    tenant = provision("db4b-a")
    other = provision("db4b-b")
    maker = tenant.memberships.select_related("user").first().user
    platform = get_user_model().objects.create_user(username="db4b_checker", password="Password@123", is_superuser=True, is_staff=True)
    return tenant, other, maker, platform


def approved_policy(tenant, category="employee_documents"):
    return RetentionPolicy.objects.create(
        tenant=tenant, jurisdiction="IN", record_category=category, retention_days=365,
        lifecycle_date_field="updated_at", status=RetentionPolicyStatus.APPROVED,
        effective_from=date(2026, 1, 1), legal_basis_ref="LEGAL-APPROVED-001",
        approval_ref="COUNSEL-001", approved_by_identifier="legal.counsel", approved_at=timezone.now(),
    )


@pytest.mark.django_db(transaction=True)
def test_missing_policy_and_active_hold_fail_closed(governance_workspace):
    tenant, _, maker, _ = governance_workspace
    preview = retention_preview(tenant, scope={"record_categories": ["employee_documents"]})
    assert preview["categories"][0]["eligible"] is False
    assert "No approved retention policy applies." in preview["categories"][0]["blockers"]

    approved_policy(tenant)
    hold = place_legal_hold(
        tenant=tenant, actor=maker, reason="Employment litigation preservation",
        authority_ref="CASE-2026-001", record_category="employee_documents",
    )
    held = retention_preview(tenant, scope={"record_categories": ["employee_documents"]})
    assert held["categories"][0]["eligible"] is False
    assert held["categories"][0]["legal_hold_count"] == 1
    assert DataGovernanceEvent.objects.filter(legal_hold=hold, event_type="legal_hold_placed").exists()


@pytest.mark.django_db(transaction=True)
def test_retention_preview_counts_only_records_past_configured_lifecycle_cutoff(governance_workspace):
    tenant, _, _, _ = governance_workspace
    policy = approved_policy(tenant, category="employee_master")
    employee = tenant.employees.first()
    tenant.employees.filter(id=employee.id).update(updated_at=timezone.now() - timedelta(days=400))

    category = retention_preview(tenant, scope={"record_categories": ["employee_master"]})["categories"][0]
    assert category["record_count"] >= 1
    assert category["eligible_record_count"] == 1
    assert category["eligible"] is True

    policy.lifecycle_date_field = "not_a_real_field"
    policy.save(update_fields=["lifecycle_date_field", "updated_at"])
    invalid = retention_preview(tenant, scope={"record_categories": ["employee_master"]})["categories"][0]
    assert invalid["eligible"] is False
    assert "unavailable" in " ".join(invalid["blockers"])


@pytest.mark.django_db(transaction=True)
def test_hold_release_requires_independent_actor_and_is_idempotent(governance_workspace):
    tenant, _, maker, checker = governance_workspace
    hold = place_legal_hold(tenant=tenant, actor=maker, reason="Investigation", authority_ref="INV-1")
    with pytest.raises(PermissionDenied):
        release_legal_hold(hold.id, actor=maker, reason="Self release")
    released = release_legal_hold(hold.id, actor=checker, reason="Authority confirmed closure")
    assert released.status == LegalHoldStatus.RELEASED
    assert release_legal_hold(hold.id, actor=checker, reason="Retry").id == hold.id
    assert DataGovernanceEvent.objects.filter(legal_hold=hold, event_type="legal_hold_released").count() == 1


@pytest.mark.django_db(transaction=True)
def test_active_legal_hold_rejects_orm_and_raw_employee_deletion(governance_workspace):
    tenant, _, maker, checker = governance_workspace
    employee = tenant.employees.first()
    hold = place_legal_hold(
        tenant=tenant, actor=maker, reason="Employee record preservation",
        authority_ref="EMP-HOLD-1", record_category="employee_master",
    )
    with pytest.raises(DatabaseError), transaction.atomic():
        tenant.employees.filter(id=employee.id).delete()
    with pytest.raises(DatabaseError), transaction.atomic(), connection.cursor() as cursor:
        cursor.execute("DELETE FROM employees_employee WHERE id = %s", [employee.id])
    release_legal_hold(hold.id, actor=checker, reason="Preservation obligation ended")


@pytest.mark.django_db(transaction=True)
def test_export_request_maker_checker_and_retry_are_idempotent(governance_workspace):
    tenant, _, maker, checker = governance_workspace
    approved_policy(tenant)
    item, created = create_governance_request(
        tenant=tenant, actor=maker, request_type=GovernanceRequestType.EXPORT,
        reason="Contractual data return", scope={"record_categories": ["employee_documents"]},
        idempotency_key="db4b-export-1",
    )
    assert created is True
    duplicate, duplicate_created = create_governance_request(
        tenant=tenant, actor=maker, request_type=GovernanceRequestType.EXPORT,
        reason="Contractual data return", scope={"record_categories": ["employee_documents"]},
        idempotency_key="db4b-export-1",
    )
    assert duplicate.id == item.id and duplicate_created is False
    with pytest.raises(PermissionDenied):
        approve_governance_request(item.id, actor=maker)
    approved, changed = approve_governance_request(item.id, actor=checker)
    assert changed is True and approved.status == GovernanceRequestStatus.APPROVED
    result = execute_governance_request(item.id, task_id="db4b-task")
    assert result.status == GovernanceRequestStatus.SUCCEEDED
    assert result.result_snapshot["protected_download_required"] is True
    assert execute_governance_request(item.id, task_id="retry").attempt_count == 1


@pytest.mark.django_db(transaction=True)
def test_worker_failure_persists_retryable_state(governance_workspace, monkeypatch):
    tenant, _, maker, checker = governance_workspace
    item, _ = create_governance_request(
        tenant=tenant, actor=maker, request_type=GovernanceRequestType.EXPORT,
        reason="Retry-state verification", scope={}, idempotency_key="db4b-retry-state",
    )
    approve_governance_request(item.id, actor=checker)

    def fail_execution(*args, **kwargs):
        raise RuntimeError("synthetic storage interruption")

    monkeypatch.setattr("apps.tenants.tasks.execute_governance_request", fail_execution)
    with pytest.raises((Retry, RuntimeError)):
        execute_data_governance_request_task.run(str(item.id))
    item.refresh_from_db()
    assert item.status == GovernanceRequestStatus.FAILED
    assert item.last_error_code == "RuntimeError"
    assert "storage interruption" in item.last_error_message


@pytest.mark.django_db(transaction=True)
def test_erasure_is_governed_and_disabled_by_default(governance_workspace, settings):
    tenant, _, maker, checker = governance_workspace
    settings.DATA_ERASURE_EXECUTION_ENABLED = False
    approved_policy(tenant)
    item, _ = create_governance_request(
        tenant=tenant, actor=maker, request_type=GovernanceRequestType.ERASURE,
        reason="Approved tenant offboarding assessment", scope={"record_categories": ["employee_documents"]},
        idempotency_key="db4b-erasure-1",
    )
    approve_governance_request(item.id, actor=checker)
    result = execute_governance_request(item.id)
    assert result.status == GovernanceRequestStatus.BLOCKED
    assert result.result_snapshot["executed"] is False
    assert "Irreversible erasure is disabled by deployment policy." in result.result_snapshot["blockers"]
    assert tenant.employees.exists()


@pytest.mark.django_db(transaction=True)
def test_database_scope_and_history_guards_cover_governance_records(governance_workspace):
    tenant, other, maker, _ = governance_workspace
    entity_other = LegalEntity.objects.get(tenant=other, code="qa-entity")
    with pytest.raises(DatabaseError), transaction.atomic():
        RetentionPolicy.objects.create(
            tenant=tenant, legal_entity=entity_other, jurisdiction="IN", record_category="leave",
            retention_days=365, lifecycle_date_field="updated_at", effective_from=date(2026, 1, 1),
            legal_basis_ref="LEGAL-1", approval_ref="APPROVAL-1",
        )
    hold = place_legal_hold(tenant=tenant, actor=maker, reason="Audit", authority_ref="AUDIT-1")
    with pytest.raises(DatabaseError), transaction.atomic():
        hold.delete()

    with redirect_stdout(StringIO()):
        call_command("manage_playwright_workspace", seed_ref="db4b-a", cleanup=True)
    assert not Tenant.objects.filter(id=tenant.id).exists()
    assert Tenant.objects.filter(id=other.id).exists()


@pytest.mark.django_db(transaction=True)
def test_governance_api_is_tenant_scoped_and_permission_controlled(governance_workspace):
    tenant, other, _, checker = governance_workspace
    tenant_admin_membership = tenant.memberships.filter(membership_roles__role__code="tenant-admin").select_related("user").first()
    employee_membership = tenant.memberships.filter(membership_roles__role__code="employee").exclude(membership_roles__role__code="tenant-admin").select_related("user").first()
    assert tenant_admin_membership and employee_membership

    client = APIClient()
    client.force_authenticate(tenant_admin_membership.user)
    workspace = client.get("/api/v1/tenant-admin/data-governance/")
    assert workspace.status_code == 200
    created = client.post(
        "/api/v1/tenant-admin/data-governance/requests/",
        {
            "request_type": "export", "reason": "Tenant contract export",
            "idempotency_key": "api-export-1", "scope": {"record_categories": ["employee_documents"]},
        },
        format="json",
    )
    assert created.status_code == 201
    assert created.json()["tenant_id"] == str(tenant.id)

    create_governance_request(
        tenant=other, actor=other.memberships.first().user, request_type=GovernanceRequestType.EXPORT,
        reason="Other tenant export", scope={}, idempotency_key="other-export",
    )
    visible_ids = {item["id"] for item in client.get("/api/v1/tenant-admin/data-governance/").json()["requests"]}
    assert created.json()["id"] in visible_ids
    assert not DataGovernanceRequest.objects.filter(tenant=other, id__in=visible_ids).exists()

    client.force_authenticate(employee_membership.user)
    assert client.get("/api/v1/tenant-admin/data-governance/").status_code == 403

    client.force_authenticate(checker)
    approved = client.post(
        f"/api/v1/platform/data-governance/requests/{created.json()['id']}/actions/",
        {"action": "approve"}, format="json",
    )
    assert approved.status_code == 200
    assert approved.json()["status"] == GovernanceRequestStatus.APPROVED
