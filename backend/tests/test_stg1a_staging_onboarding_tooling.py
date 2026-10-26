import json
from pathlib import Path
from unittest.mock import patch

import pytest
import psycopg
from django.core.exceptions import PermissionDenied
from django.core.management.base import CommandError
from django.db import connection
from django.test import override_settings
from rest_framework.test import APIClient

from apps.common.staging_onboarding import (
    collect_onboarding_evidence,
    execute_onboarding_cleanup,
    load_run_manifest,
    plan_onboarding_cleanup,
)
from apps.iam.models import TenantMembership, User
from apps.organizations.models import LegalEntity
from apps.tenants.models import SubscriptionPlan, Tenant


RUN_ID = "stg1-tooling-local-001"
FINGERPRINT = "local-postgresql-stg1a"
PASSWORD = "Password@123"
STAGING_CLEANUP_SETTINGS = {
    "HRMS_ENVIRONMENT": "staging",
    "HRMS_STAGING_ENVIRONMENT_FINGERPRINT": FINGERPRINT,
    "HRMS_STAGING_SYNTHETIC_CLEANUP_ENABLED": True,
}


def _event(event_type, *, scenario_id=None, resource=None, run_id=RUN_ID, fingerprint=FINGERPRINT):
    payload = {
        "schema_version": 1,
        "event_id": f"event-{event_type}-{scenario_id or 'run'}-{resource['resource_type'] if resource else 'none'}",
        "event_type": event_type,
        "recorded_at": "2026-10-26T00:00:00Z",
        "run_id": run_id,
        "candidate_git_sha": "a" * 40,
        "deployment": {
            "environment_fingerprint": fingerprint,
            "application_sha": "b" * 40,
            "backend_image_digest": "sha256:" + "c" * 64,
            "web_image_digest": "sha256:" + "d" * 64,
        },
    }
    if scenario_id:
        payload["scenario_id"] = scenario_id
        payload["test_file"] = "web/tests/e2e/stg0d-batch1-onboarding.spec.ts"
        payload["test_title"] = f"{scenario_id} synthetic test"
    if resource:
        payload["resource"] = resource
    return payload


def _write_manifest(path: Path, events):
    path.write_text("".join(json.dumps(event) + "\n" for event in events), encoding="utf-8")
    return load_run_manifest(path, expected_run_id=RUN_ID, expected_fingerprint=FINGERPRINT)


@pytest.fixture()
def platform_user(db):
    return User.objects.create_superuser(
        username="stg1a.platform",
        email="stg1a.platform@playwright.qa.invalid",
        password=PASSWORD,
    )


@pytest.fixture()
def owned_graph(tmp_path, platform_user):
    client = APIClient()
    client.force_authenticate(platform_user)
    created = client.post(
        "/api/v1/platform/tenants/",
        {
            "code": "pw-qa-stg1-tooling-local-001",
            "name": "STG1A Owned Tenant",
            "legal_name": "STG1A Owned Tenant Pvt Ltd",
            "primary_domain": "stg1a.playwright.qa.invalid",
            "primary_email": f"owner+{RUN_ID}@playwright.qa.invalid",
            "subscription_plan": SubscriptionPlan.ENTERPRISE,
            "seed_pack": "standard_office",
            "timezone": "Asia/Kolkata",
            "country_code": "IN",
            "is_sandbox": True,
        },
        format="json",
    )
    assert created.status_code == 201, created.json()
    tenant = Tenant.objects.get(id=created.json()["id"])
    contact = client.post(
        f"/api/v1/platform/tenants/{tenant.id}/admin-contacts/",
        {
            "full_name": "STG1A Admin",
            "email": "admin+stg1a@playwright.qa.invalid",
            "job_title": "Tenant Admin",
            "is_primary": True,
        },
        format="json",
    )
    provision = client.post(
        f"/api/v1/platform/admin-contacts/{contact.json()['id']}/provision-user/",
        {
            "username": "stg1a.tenant.admin",
            "role_code": "tenant-admin",
            "role_name": "Tenant Admin",
            "password": PASSWORD,
            "must_change_password": False,
            "membership_status": "active",
        },
        format="json",
    )
    assert provision.status_code == 200, provision.json()
    updated = client.patch(
        f"/api/v1/platform/tenants/{tenant.id}/",
        {"status": "active", "subscription_plan": SubscriptionPlan.ENTERPRISE},
        format="json",
    )
    assert updated.status_code == 200, updated.json()
    tenant.refresh_from_db()
    denied_code = "pw-qa-stg1-denied-001"
    events = [_event("run_started")]
    for number in range(1, 7):
        scenario = f"STG-E2E-010{number}"
        events.extend([_event("scenario_started", scenario_id=scenario), _event("scenario_finished", scenario_id=scenario)])
    resources = [
        {
            "resource_type": "tenant",
            "resource_id": str(tenant.id),
            "tenant_id": str(tenant.id),
            "ownership": "created",
            "attributes": {"code": tenant.code, "primary_email": tenant.primary_email},
        },
        {
            "resource_type": "user",
            "resource_id": provision.json()["user_id"],
            "tenant_id": str(tenant.id),
            "ownership": "created",
            "attributes": {"synthetic_recipient_ref": "admin+stg1a@playwright.qa.invalid"},
        },
        {
            "resource_type": "membership",
            "resource_id": provision.json()["membership_id"],
            "tenant_id": str(tenant.id),
            "ownership": "created",
            "attributes": {},
        },
        {
            "resource_type": "denied_tenant",
            "resource_id": str(tenant.id),
            "tenant_id": str(tenant.id),
            "ownership": "observed",
            "attributes": {"code": denied_code},
        },
    ]
    events.extend(_event("resource_registered", scenario_id="STG-E2E-0101", resource=item) for item in resources)
    manifest_path = tmp_path / "run.jsonl"
    manifest = _write_manifest(manifest_path, events)
    return tenant, provision.json(), manifest, manifest_path


@pytest.mark.django_db(transaction=True)
def test_exact_id_evidence_is_postgresql_read_only_and_reconciles_owned_graph(owned_graph):
    tenant, provision, manifest, _ = owned_graph
    with connection.cursor() as cursor:
        cursor.execute("SELECT current_user")
        role = cursor.fetchone()[0]
    with override_settings(HRMS_STAGING_EVIDENCE_DB_ROLE=role):
        evidence = collect_onboarding_evidence(manifest)
    assert evidence["tenant"] == {
        "id": str(tenant.id),
        "code": tenant.code,
        "status": tenant.status,
        "subscription_plan": "enterprise",
        "sandbox": True,
        "domain_count": 1,
    }
    assert evidence["relationships"] == {"generated_admin_count": 1, "membership_count": 1}
    assert all(evidence["assertions"].values())
    assert str(provision["user_id"]) not in json.dumps(evidence)


@pytest.mark.django_db(transaction=True)
def test_cleanup_is_dry_run_by_default_and_repeated_plan_is_idempotent(owned_graph):
    tenant, _, manifest, _ = owned_graph
    first = plan_onboarding_cleanup(manifest)
    second = plan_onboarding_cleanup(manifest)
    assert first == second
    assert first["dry_run"] is True and first["verified_absent"] is False
    assert Tenant.objects.filter(id=tenant.id).exists()


@pytest.mark.django_db(transaction=True)
def test_destructive_cleanup_requires_feature_gate_actor_authorization_and_recovery(owned_graph):
    _, _, manifest, _ = owned_graph
    with pytest.raises(PermissionDenied, match="restricted to the staging"):
        execute_onboarding_cleanup(manifest, actor_username="stg1a.platform", authorization_ref="AUTH-1", recovery_ref="REC-1")
    with override_settings(
        HRMS_ENVIRONMENT="staging",
        HRMS_STAGING_ENVIRONMENT_FINGERPRINT=FINGERPRINT,
        HRMS_STAGING_SYNTHETIC_CLEANUP_ENABLED=False,
    ):
        with pytest.raises(PermissionDenied, match="deployment-disabled"):
            execute_onboarding_cleanup(manifest, actor_username="stg1a.platform", authorization_ref="AUTH-1", recovery_ref="REC-1")
    with override_settings(**{**STAGING_CLEANUP_SETTINGS, "HRMS_STAGING_ENVIRONMENT_FINGERPRINT": "wrong-environment"}):
        with pytest.raises(PermissionDenied, match="fingerprint"):
            execute_onboarding_cleanup(manifest, actor_username="stg1a.platform", authorization_ref="AUTH-1", recovery_ref="REC-1")
    with override_settings(**STAGING_CLEANUP_SETTINGS):
        with pytest.raises(PermissionDenied, match="authorization and recovery"):
            execute_onboarding_cleanup(manifest, actor_username="stg1a.platform", authorization_ref="", recovery_ref="")


@pytest.mark.django_db(transaction=True)
def test_authorized_cleanup_removes_only_exact_owned_graph_and_replay_is_safe(owned_graph, platform_user):
    tenant, provision, manifest, _ = owned_graph
    unrelated = User.objects.create_user(username="unrelated.user", email="unrelated@example.test", password=PASSWORD)
    with override_settings(**STAGING_CLEANUP_SETTINGS):
        result = execute_onboarding_cleanup(
            manifest,
            actor_username=platform_user.username,
            authorization_ref="LOCAL-AUTH-1",
            recovery_ref="LOCAL-RECOVERY-1",
        )
        replay = execute_onboarding_cleanup(
            manifest,
            actor_username=platform_user.username,
            authorization_ref="LOCAL-AUTH-1",
            recovery_ref="LOCAL-RECOVERY-1",
        )
    assert result["verified_absent"] is True and replay["verified_absent"] is True
    assert not Tenant.objects.filter(id=tenant.id).exists()
    assert not User.objects.filter(id=provision["user_id"]).exists()
    assert User.objects.filter(id=unrelated.id).exists()


@pytest.mark.django_db(transaction=True)
def test_cleanup_interruption_rolls_back_and_retry_recovers(owned_graph, platform_user):
    tenant, provision, manifest, _ = owned_graph
    original_filter = User.objects.filter

    def interrupted_filter(*args, **kwargs):
        queryset = original_filter(*args, **kwargs)
        if kwargs.get("tenant_memberships__isnull") is True:
            queryset.delete = lambda: (_ for _ in ()).throw(RuntimeError("injected cleanup interruption"))
        return queryset

    with override_settings(**STAGING_CLEANUP_SETTINGS):
        with patch("apps.common.staging_onboarding.User.objects.filter", side_effect=interrupted_filter):
            with pytest.raises(RuntimeError, match="injected cleanup interruption"):
                execute_onboarding_cleanup(
                    manifest,
                    actor_username=platform_user.username,
                    authorization_ref="LOCAL-AUTH-ROLLBACK",
                    recovery_ref="LOCAL-RECOVERY-ROLLBACK",
                )
        assert Tenant.objects.filter(id=tenant.id).exists()
        assert User.objects.filter(id=provision["user_id"]).exists()
        result = execute_onboarding_cleanup(
            manifest,
            actor_username=platform_user.username,
            authorization_ref="LOCAL-AUTH-RETRY",
            recovery_ref="LOCAL-RECOVERY-RETRY",
        )
    assert result["verified_absent"] is True
    assert not Tenant.objects.filter(id=tenant.id).exists()
    assert not User.objects.filter(id=provision["user_id"]).exists()


@pytest.mark.django_db(transaction=True)
def test_concurrent_cleanup_attempt_is_rejected_by_run_lock(owned_graph, platform_user):
    _, _, manifest, _ = owned_graph
    params = connection.get_connection_params()
    with psycopg.connect(**params) as lock_connection:
        with lock_connection.cursor() as cursor:
            cursor.execute("SELECT pg_advisory_xact_lock(hashtext(%s))", [manifest.run_id])
        with override_settings(**STAGING_CLEANUP_SETTINGS):
            with pytest.raises(CommandError, match="Another cleanup attempt"):
                execute_onboarding_cleanup(
                    manifest,
                    actor_username=platform_user.username,
                    authorization_ref="LOCAL-AUTH-CONCURRENT",
                    recovery_ref="LOCAL-RECOVERY-CONCURRENT",
                )


@pytest.mark.django_db(transaction=True)
def test_cleanup_refuses_unexpected_protected_records(owned_graph):
    tenant, _, manifest, _ = owned_graph
    LegalEntity.objects.create(tenant=tenant, code="unexpected", name="Unexpected", registered_name="Unexpected Pvt Ltd")
    with pytest.raises(CommandError, match="protected downstream records"):
        plan_onboarding_cleanup(manifest)


@pytest.mark.django_db(transaction=True)
def test_cleanup_refuses_tenant_marker_mismatch(owned_graph):
    tenant, _, manifest, _ = owned_graph
    Tenant.objects.filter(id=tenant.id).update(code="pw-qa-stg1-marker-changed")
    with pytest.raises(CommandError, match="exact-ID ownership"):
        plan_onboarding_cleanup(manifest)


@pytest.mark.django_db(transaction=True)
def test_cleanup_refuses_unowned_and_cross_tenant_memberships(owned_graph):
    tenant, provision, manifest, _ = owned_graph
    foreign_user = User.objects.create_user(username="foreign.user", email="foreign@example.test", password=PASSWORD)
    TenantMembership.objects.create(tenant=tenant, user=foreign_user, status="active")
    with pytest.raises(CommandError, match="unowned user membership"):
        plan_onboarding_cleanup(manifest)
    TenantMembership.objects.filter(user=foreign_user).delete()
    foreign_tenant = Tenant.objects.create(code="foreign-tenant", name="Foreign Tenant")
    TenantMembership.objects.create(tenant=foreign_tenant, user_id=provision["user_id"], status="active")
    with pytest.raises(CommandError, match="foreign tenant membership"):
        plan_onboarding_cleanup(manifest)


@pytest.mark.django_db(transaction=True)
def test_evidence_rejects_cross_tenant_generated_admin(owned_graph):
    _, provision, manifest, _ = owned_graph
    foreign_tenant = Tenant.objects.create(code="foreign-evidence", name="Foreign Evidence")
    TenantMembership.objects.create(tenant=foreign_tenant, user_id=provision["user_id"], status="active")
    with connection.cursor() as cursor:
        cursor.execute("SELECT current_user")
        role = cursor.fetchone()[0]
    with override_settings(HRMS_STAGING_EVIDENCE_DB_ROLE=role):
        with pytest.raises(CommandError, match="cross-tenant membership"):
            collect_onboarding_evidence(manifest)


def test_manifest_rejects_interruption_missing_ids_wrong_run_and_environment(tmp_path):
    broken = tmp_path / "broken.jsonl"
    broken.write_text(json.dumps(_event("run_started")) + "\n{", encoding="utf-8")
    with pytest.raises(CommandError, match="incomplete"):
        load_run_manifest(broken, expected_run_id=RUN_ID, expected_fingerprint=FINGERPRINT)
    missing = tmp_path / "missing.jsonl"
    missing.write_text(
        json.dumps(
            _event(
                "resource_registered",
                scenario_id="STG-E2E-0101",
                resource={"resource_type": "tenant", "resource_id": "", "ownership": "created"},
            )
        )
        + "\n",
        encoding="utf-8",
    )
    with pytest.raises(CommandError, match="valid identifier"):
        load_run_manifest(missing, expected_run_id=RUN_ID, expected_fingerprint=FINGERPRINT)
    valid = tmp_path / "valid.jsonl"
    valid.write_text(json.dumps(_event("run_started")) + "\n", encoding="utf-8")
    with pytest.raises(CommandError, match="run identity"):
        load_run_manifest(valid, expected_run_id="stg1-another-run", expected_fingerprint=FINGERPRINT)
    with pytest.raises(CommandError, match="fingerprint"):
        load_run_manifest(valid, expected_run_id=RUN_ID, expected_fingerprint="wrong-environment")


def test_manifest_rejects_conflicting_duplicate_registration(tmp_path):
    resource = {
        "resource_type": "tenant",
        "resource_id": "11111111-1111-4111-8111-111111111111",
        "tenant_id": "11111111-1111-4111-8111-111111111111",
        "ownership": "created",
        "attributes": {"code": "pw-qa-stg1-one"},
    }
    conflicting = {**resource, "ownership": "unowned"}
    path = tmp_path / "duplicate.jsonl"
    path.write_text(
        json.dumps(_event("resource_registered", scenario_id="STG-E2E-0101", resource=resource))
        + "\n"
        + json.dumps(_event("resource_registered", scenario_id="STG-E2E-0101", resource=conflicting))
        + "\n",
        encoding="utf-8",
    )
    with pytest.raises(CommandError, match="Conflicting ownership"):
        load_run_manifest(path, expected_run_id=RUN_ID, expected_fingerprint=FINGERPRINT)


@pytest.mark.django_db(transaction=True)
def test_evidence_fails_closed_without_exact_owned_tenant(tmp_path):
    path = tmp_path / "no-tenant.jsonl"
    manifest = _write_manifest(path, [_event("run_started")])
    with pytest.raises(CommandError, match="exactly one owned tenant"):
        collect_onboarding_evidence(manifest)
