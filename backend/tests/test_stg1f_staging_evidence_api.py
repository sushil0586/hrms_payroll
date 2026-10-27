import hashlib
import io
import json
import logging
from datetime import timedelta

import pytest
from django.contrib.auth.models import Permission
from django.db import connection
from django.utils import timezone
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from apps.common.models import StagingEvidenceAuthorization
from apps.common.security_logging import SecurityAuditJsonFormatter
from apps.iam.models import TenantMembership, User
from apps.tenant_onboarding.models import TenantOnboardingAdminContact
from apps.tenants.models import Tenant


PASSWORD = "Password@123"
FINGERPRINT = "staging:hrms.accerio.in:test"
MANIFEST_SHA256 = "a" * 64
RUN_ID = "stg1-evidence-001"
TENANT_CODE = f"pw-qa-{RUN_ID}"
EVIDENCE_URL = "/api/v1/platform/qa/staging-onboarding-evidence/"

pytestmark = [pytest.mark.django_db(transaction=True)]


def _tenant_payload(code: str) -> dict:
    return {
        "code": code,
        "name": f"STG-1F {code}",
        "legal_name": f"STG-1F {code} Pvt Ltd",
        "primary_domain": f"{code}.playwright.qa.invalid",
        "primary_email": f"owner+{code}@playwright.qa.invalid",
        "subscription_plan": "enterprise",
        "seed_pack": "standard_office",
        "timezone": "Asia/Kolkata",
        "country_code": "IN",
        "is_sandbox": True,
    }


@pytest.fixture()
def graph():
    assert connection.vendor == "postgresql", "STG-1F evidence integrity tests require PostgreSQL."
    setup_actor = User.objects.create_user(
        username="stg1f.setup.actor",
        email="setup.actor@playwright.qa.invalid",
        password=PASSWORD,
        is_staff=True,
        is_superuser=True,
    )
    actor = User.objects.create_user(
        username="stg1f.evidence.actor",
        email="evidence.actor@playwright.qa.invalid",
        password=PASSWORD,
        is_staff=False,
        is_superuser=False,
    )
    actor.user_permissions.add(
        Permission.objects.get(
            content_type__app_label="common",
            codename="view_staging_evidence",
        )
    )
    setup = APIClient()
    setup.force_authenticate(setup_actor)
    tenant_response = setup.post("/api/v1/platform/tenants/", _tenant_payload(TENANT_CODE), format="json")
    assert tenant_response.status_code == 201, tenant_response.json()
    tenant = Tenant.objects.get(id=tenant_response.json()["id"])

    contact_ids = []
    for index, email in enumerate(("tenant.admin@playwright.qa.invalid", "duplicate.admin@playwright.qa.invalid")):
        contact_response = setup.post(
            f"/api/v1/platform/tenants/{tenant.id}/admin-contacts/",
            {
                "full_name": f"STG-1F Admin {index}",
                "email": email,
                "job_title": "Tenant Admin",
                "is_primary": index == 0,
            },
            format="json",
        )
        assert contact_response.status_code == 201, contact_response.json()
        contact_ids.append(contact_response.json()["id"])

    provision = setup.post(
        f"/api/v1/platform/admin-contacts/{contact_ids[0]}/provision-user/",
        {
            "username": "stg1f.tenant.admin",
            "role_code": "tenant-admin",
            "role_name": "Tenant Admin",
            "password": PASSWORD,
            "must_change_password": False,
            "membership_status": "active",
        },
        format="json",
    )
    assert provision.status_code == 200, provision.json()

    setup.patch(
        f"/api/v1/platform/tenants/{tenant.id}/",
        {"status": "active", "subscription_plan": "enterprise"},
        format="json",
    )
    authorization = StagingEvidenceAuthorization.objects.create(
        principal=actor,
        run_id=RUN_ID,
        tenant_code=TENANT_CODE,
        scenario_ids=[f"STG-E2E-010{number}" for number in range(1, 7)],
        environment_fingerprint_sha256=hashlib.sha256(FINGERPRINT.encode()).hexdigest(),
        authorization_ref="STG-1F-LOCAL-TEST",
        authorized_by_identifier=setup_actor.username,
        expires_at=timezone.now() + timedelta(hours=1),
    )
    return {
        "actor": actor,
        "setup_actor": setup_actor,
        "token": Token.objects.create(user=actor),
        "authorization": authorization,
        "tenant": tenant,
        "contact_ids": contact_ids,
        "user_id": provision.json()["user_id"],
        "membership_id": provision.json()["membership_id"],
    }


def _client(graph, *, token=None) -> APIClient:
    client = APIClient()
    if token is not False:
        client.credentials(HTTP_AUTHORIZATION=f"Token {token or graph['token'].key}")
    return client


def _params(graph, scenario_id="STG-E2E-0101", **overrides):
    values = {
        "run_id": RUN_ID,
        "scenario_id": scenario_id,
        "tenant_id": str(graph["tenant"].id),
        "tenant_code": TENANT_CODE,
    }
    if scenario_id in {"STG-E2E-0103", "STG-E2E-0105", "STG-E2E-0106"}:
        values.update(admin_user_id=graph["user_id"], admin_membership_id=graph["membership_id"])
    if scenario_id == "STG-E2E-0103":
        values["admin_contact_id"] = graph["contact_ids"]
    if scenario_id == "STG-E2E-0106":
        values["denied_tenant_code"] = f"{TENANT_CODE}-denied"
    values.update(overrides)
    return values


def _get(graph, scenario_id="STG-E2E-0101", *, client=None, headers=None, **overrides):
    request_headers = {
        "HTTP_X_HRMS_ENVIRONMENT_FINGERPRINT": FINGERPRINT,
        "HTTP_X_HRMS_MANIFEST_SHA256": MANIFEST_SHA256,
    }
    request_headers.update(headers or {})
    return (client or _client(graph)).get(EVIDENCE_URL, _params(graph, scenario_id, **overrides), **request_headers)


@pytest.fixture(autouse=True)
def evidence_settings(settings, graph):
    settings.HRMS_ENVIRONMENT = "staging"
    settings.HRMS_STAGING_EVIDENCE_API_ENABLED = True
    settings.HRMS_STAGING_EVIDENCE_API_ACTORS = [graph["actor"].username]
    settings.HRMS_STAGING_ENVIRONMENT_FINGERPRINT = FINGERPRINT


@pytest.mark.parametrize("scenario_id", [f"STG-E2E-010{number}" for number in range(1, 7)])
def test_frozen_scenario_schema_returns_only_bounded_redacted_evidence(graph, scenario_id):
    before = {
        "tenants": Tenant.objects.count(),
        "memberships": TenantMembership.objects.count(),
        "contacts": TenantOnboardingAdminContact.objects.count(),
    }

    result = _get(graph, scenario_id)

    assert result.status_code == 200, result.json()
    assert result.json()["passed"] is True
    assert result.json()["scenario_id"] == scenario_id
    assert set(result.json()) == {
        "schema_version", "permission", "run_id", "scenario_id",
        "environment_fingerprint_sha256", "manifest_sha256", "tenant", "assertions", "passed",
    }
    serialized = result.content.decode().lower()
    assert "@playwright.qa.invalid" not in serialized
    assert "password" not in serialized
    assert User.objects.get(id=graph["user_id"]).email.lower() not in serialized
    assert before == {
        "tenants": Tenant.objects.count(),
        "memberships": TenantMembership.objects.count(),
        "contacts": TenantOnboardingAdminContact.objects.count(),
    }


def test_requires_strong_authenticated_identity(graph):
    result = _get(graph, client=_client(graph, token=False))
    assert result.status_code == 401


def test_rejects_authenticated_actor_without_dedicated_configuration(graph, settings):
    other = User.objects.create_user(username="stg1f.other", password=PASSWORD)
    settings.HRMS_STAGING_EVIDENCE_API_ACTORS = [graph["actor"].username]
    result = _get(graph, client=_client(graph, token=Token.objects.create(user=other).key))
    assert result.status_code == 403


def test_accepts_non_superuser_only_with_direct_permission_and_active_run(graph):
    assert graph["actor"].is_superuser is False
    assert graph["actor"].is_staff is False
    assert graph["actor"].user_permissions.filter(codename="view_staging_evidence").exists()
    assert _get(graph).status_code == 200


def test_rejects_superuser_even_when_allowlisted(graph, settings):
    superuser = graph["setup_actor"]
    superuser.user_permissions.add(
        Permission.objects.get(content_type__app_label="common", codename="view_staging_evidence")
    )
    settings.HRMS_STAGING_EVIDENCE_API_ACTORS = [superuser.username]
    client = _client(graph, token=Token.objects.create(user=superuser).key)
    assert _get(graph, client=client).status_code == 403


def test_rejects_tenant_personas_without_direct_evidence_permission(graph, settings):
    membership = TenantMembership.objects.get(id=graph["membership_id"])
    tenant_admin = membership.user
    settings.HRMS_STAGING_EVIDENCE_API_ACTORS = [tenant_admin.username]
    client = _client(graph, token=Token.objects.create(user=tenant_admin).key)
    assert _get(graph, client=client).status_code == 403


def test_api_is_disabled_by_default_and_outside_staging(graph, settings):
    settings.HRMS_STAGING_EVIDENCE_API_ENABLED = False
    assert _get(graph).status_code == 404
    settings.HRMS_STAGING_EVIDENCE_API_ENABLED = True
    settings.HRMS_ENVIRONMENT = "production"
    assert _get(graph).status_code == 404


def test_rejects_wrong_or_missing_environment_fingerprint(graph):
    assert _get(graph, headers={"HTTP_X_HRMS_ENVIRONMENT_FINGERPRINT": "wrong"}).status_code == 403
    assert _get(graph, headers={"HTTP_X_HRMS_ENVIRONMENT_FINGERPRINT": ""}).status_code == 403


def test_rejects_unsupported_scenario_invalid_run_and_missing_identifiers(graph):
    assert _get(graph, scenario_id="STG-E2E-0199").status_code == 400
    assert _get(graph, run_id="other-run", tenant_code=TENANT_CODE).status_code == 400
    assert _get(graph, scenario_id="STG-E2E-0105", admin_user_id="", admin_membership_id="").status_code == 400


def test_rejects_forged_run_without_server_authorization(graph):
    forged_run = "stg1-forged-001"
    result = _get(graph, run_id=forged_run, tenant_code=f"pw-qa-{forged_run}")
    assert result.status_code == 403


def test_rejects_expired_and_revoked_run_authorization(graph):
    grant = graph["authorization"]
    grant.expires_at = timezone.now() - timedelta(seconds=1)
    StagingEvidenceAuthorization.objects.filter(id=grant.id).update(expires_at=grant.expires_at)
    assert _get(graph).status_code == 403

    StagingEvidenceAuthorization.objects.filter(id=grant.id).update(
        expires_at=timezone.now() + timedelta(hours=1),
        revoked_at=timezone.now(),
        revocation_reason="Test revocation",
    )
    assert _get(graph).status_code == 403


def test_rejects_tenant_scope_and_cross_tenant_resource_identifiers(graph):
    other = Tenant.objects.create(
        code="pw-qa-stg1-foreign-001", name="Foreign", primary_email="foreign@playwright.qa.invalid", is_sandbox=True,
    )
    foreign_user = User.objects.create_user(username="foreign.admin", password=PASSWORD)
    foreign_membership = TenantMembership.objects.create(tenant=other, user=foreign_user, status="active")

    mismatch = _get(graph, tenant_id=str(other.id))
    foreign_resource = _get(
        graph,
        scenario_id="STG-E2E-0105",
        admin_user_id=str(foreign_user.id),
        admin_membership_id=str(foreign_membership.id),
    )

    assert mismatch.status_code == 403
    assert foreign_resource.status_code == 403


def test_rejects_unbounded_contact_identifier_lists(graph):
    too_many = [str(graph["contact_ids"][0])] * 11
    result = _get(graph, scenario_id="STG-E2E-0103", admin_contact_id=too_many)
    assert result.status_code == 400


def test_get_only_contract_and_negative_operation_persistence(graph):
    denied_code = f"{TENANT_CODE}-denied"
    before = Tenant.objects.count()
    evidence = _get(graph, scenario_id="STG-E2E-0106", denied_tenant_code=denied_code)
    client = _client(graph)
    mutations = [
        client.post(EVIDENCE_URL, {}, format="json"),
        client.put(EVIDENCE_URL, {}, format="json"),
        client.patch(EVIDENCE_URL, {}, format="json"),
        client.delete(EVIDENCE_URL),
    ]

    assert evidence.status_code == 200
    assert evidence.json()["assertions"]["denied_tenant_absent"] is True
    assert {mutation.status_code for mutation in mutations} == {405}
    assert Tenant.objects.count() == before
    assert not Tenant.objects.filter(code=denied_code).exists()


def test_access_and_denial_events_reach_structured_handler_without_sensitive_payloads(graph):
    stream = io.StringIO()
    handler = logging.StreamHandler(stream)
    handler.setFormatter(SecurityAuditJsonFormatter())
    audit_logger = logging.getLogger("hrms.security.staging_evidence")
    original_handlers = audit_logger.handlers[:]
    original_level = audit_logger.level
    original_propagate = audit_logger.propagate
    audit_logger.handlers = [handler]
    audit_logger.setLevel(logging.INFO)
    audit_logger.propagate = False
    try:
        assert _get(graph, headers={"HTTP_X_REQUEST_ID": "audit-allowed-001"}).status_code == 200
        assert _get(
            graph,
            headers={
                "HTTP_X_HRMS_ENVIRONMENT_FINGERPRINT": "wrong",
                "HTTP_X_REQUEST_ID": "audit-denied-001",
            },
        ).status_code == 403
    finally:
        audit_logger.handlers = original_handlers
        audit_logger.setLevel(original_level)
        audit_logger.propagate = original_propagate

    events = [json.loads(line) for line in stream.getvalue().splitlines()]
    assert {event["outcome"] for event in events} == {"allowed", "denied"}
    assert {event["correlation_id"] for event in events} == {"audit-allowed-001", "audit-denied-001"}
    assert events[0]["logger"] == "hrms.security.staging_evidence"
    assert all(event["environment"] == "staging" for event in events)
    assert all(event["actor_ref"] and len(event["actor_ref"]) == 24 for event in events)
    assert all("actor" not in event for event in events)
    assert all("tenant_id" not in event for event in events)
    serialized = stream.getvalue().lower()
    assert "@playwright.qa.invalid" not in serialized
    assert "password" not in serialized
    assert "authorization" not in serialized or "authorization_ref" in serialized


def test_evidence_logger_has_dedicated_info_handler():
    audit_logger = logging.getLogger("hrms.security.staging_evidence")
    assert audit_logger.getEffectiveLevel() == logging.INFO
    assert audit_logger.propagate is False
    assert audit_logger.handlers
    assert all(handler.level <= logging.INFO for handler in audit_logger.handlers)
