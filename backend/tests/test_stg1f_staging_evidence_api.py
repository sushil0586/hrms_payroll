import logging

import pytest
from django.db import connection
from django.test import override_settings
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

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
    actor = User.objects.create_user(
        username="stg1f.evidence.actor",
        email="evidence.actor@playwright.qa.invalid",
        password=PASSWORD,
        is_staff=True,
        is_superuser=True,
    )
    setup = APIClient()
    setup.force_authenticate(actor)
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
    return {
        "actor": actor,
        "token": Token.objects.create(user=actor),
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
    other = User.objects.create_user(username="stg1f.other", password=PASSWORD, is_superuser=True, is_staff=True)
    settings.HRMS_STAGING_EVIDENCE_API_ACTORS = [graph["actor"].username]
    result = _get(graph, client=_client(graph, token=Token.objects.create(user=other).key))
    assert result.status_code == 403


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
    mutation = _client(graph).post(EVIDENCE_URL, {}, format="json")

    assert evidence.status_code == 200
    assert evidence.json()["assertions"]["denied_tenant_absent"] is True
    assert mutation.status_code == 405
    assert Tenant.objects.count() == before
    assert not Tenant.objects.filter(code=denied_code).exists()


def test_access_and_denial_events_are_audited_without_sensitive_payloads(graph, caplog):
    caplog.set_level(logging.INFO, logger="hrms.security.staging_evidence")
    assert _get(graph).status_code == 200
    assert _get(graph, headers={"HTTP_X_HRMS_ENVIRONMENT_FINGERPRINT": "wrong"}).status_code == 403

    records = [record for record in caplog.records if record.getMessage() == "staging_evidence_access"]
    assert {record.outcome for record in records} >= {"allowed", "denied"}
    assert all(not hasattr(record, "password") for record in records)
    assert all("@playwright.qa.invalid" not in record.getMessage() for record in records)
