import pytest
from rest_framework.test import APIClient

from apps.iam.models import MembershipRole, TenantMembership, User
from apps.tenant_onboarding.models import TenantOnboardingAdminContact, TenantOnboardingEvent
from apps.tenants.models import SubscriptionPlan, Tenant, TenantDomain, TenantStatus


PASSWORD = "Password@123"


@pytest.fixture()
def platform_user(db):
    return User.objects.create_user(
        username="stg0d.platform",
        email="stg0d.platform@playwright.qa.invalid",
        password=PASSWORD,
        is_staff=True,
        is_superuser=True,
        is_active=True,
    )


@pytest.fixture()
def platform_client(platform_user):
    client = APIClient()
    client.force_authenticate(user=platform_user)
    return client


def tenant_payload(code: str, *, email: str | None = None) -> dict:
    return {
        "code": code,
        "name": f"STG-0D {code}",
        "legal_name": f"STG-0D {code} Pvt Ltd",
        "primary_domain": f"{code}.playwright.qa.invalid",
        "primary_email": email or f"owner+{code}@playwright.qa.invalid",
        "subscription_plan": SubscriptionPlan.ENTERPRISE,
        "seed_pack": "standard_office",
        "timezone": "Asia/Kolkata",
        "country_code": "IN",
        "is_sandbox": True,
    }


@pytest.mark.django_db
def test_stg_e2e_0101_browser_api_contract_persists_owned_tenant_and_audit(platform_client):
    response = platform_client.post("/api/v1/platform/tenants/", tenant_payload("stg0d-0101"), format="json")

    assert response.status_code == 201, response.json()
    tenant = Tenant.objects.get(id=response.json()["id"])
    assert tenant.code == "stg0d-0101"
    assert tenant.is_sandbox is True
    assert tenant.subscription_plan == SubscriptionPlan.ENTERPRISE
    assert TenantDomain.objects.get(tenant=tenant, is_primary=True).domain == "stg0d-0101.playwright.qa.invalid"
    event = TenantOnboardingEvent.objects.get(onboarding=tenant.onboarding_record, event_type="tenant_created")
    assert event.payload["tenant_id"] == str(tenant.id)


@pytest.mark.django_db
def test_stg_e2e_0102_duplicate_code_is_rejected_without_partial_rows(platform_client):
    first = platform_client.post("/api/v1/platform/tenants/", tenant_payload("stg0d-0102"), format="json")
    before_domains = TenantDomain.objects.count()
    duplicate = platform_client.post(
        "/api/v1/platform/tenants/",
        tenant_payload("stg0d-0102", email="other+0102@playwright.qa.invalid"),
        format="json",
    )

    assert first.status_code == 201
    assert duplicate.status_code == 400
    assert "already exists" in str(duplicate.json())
    assert Tenant.objects.filter(code__iexact="stg0d-0102").count() == 1
    assert TenantDomain.objects.count() == before_domains


@pytest.mark.django_db
def test_stg_e2e_0103_duplicate_admin_email_is_rejected_without_identity_or_membership(platform_client):
    tenant_response = platform_client.post("/api/v1/platform/tenants/", tenant_payload("stg0d-0103"), format="json")
    tenant = Tenant.objects.get(id=tenant_response.json()["id"])
    existing = User.objects.create_user(
        username="stg0d.existing",
        email="duplicate.admin@playwright.qa.invalid",
        password=PASSWORD,
    )
    contact_response = platform_client.post(
        f"/api/v1/platform/tenants/{tenant.id}/admin-contacts/",
        {
            "full_name": "Duplicate Admin",
            "email": existing.email.upper(),
            "job_title": "Tenant Admin",
            "is_primary": True,
        },
        format="json",
    )
    contact = TenantOnboardingAdminContact.objects.get(id=contact_response.json()["id"])
    before_users = User.objects.count()
    before_memberships = TenantMembership.objects.filter(tenant=tenant).count()

    provision = platform_client.post(
        f"/api/v1/platform/admin-contacts/{contact.id}/provision-user/",
        {
            "username": "stg0d.duplicate.admin",
            "role_code": "tenant-admin",
            "password": PASSWORD,
            "must_change_password": False,
            "membership_status": "active",
        },
        format="json",
    )

    assert provision.status_code == 400
    assert "already exists" in str(provision.json())
    assert User.objects.count() == before_users
    assert TenantMembership.objects.filter(tenant=tenant).count() == before_memberships
    contact.refresh_from_db()
    assert contact.user_id is None and contact.membership_id is None


@pytest.mark.django_db
def test_stg_e2e_0104_activation_persists_enterprise_subscription_and_audit(platform_client):
    created = platform_client.post("/api/v1/platform/tenants/", tenant_payload("stg0d-0104"), format="json")
    tenant_id = created.json()["id"]
    activated = platform_client.patch(
        f"/api/v1/platform/tenants/{tenant_id}/",
        {"status": TenantStatus.ACTIVE, "subscription_plan": SubscriptionPlan.ENTERPRISE},
        format="json",
    )

    assert activated.status_code == 200, activated.json()
    tenant = Tenant.objects.get(id=tenant_id)
    assert tenant.status == TenantStatus.ACTIVE
    assert tenant.subscription_plan == SubscriptionPlan.ENTERPRISE
    assert TenantOnboardingEvent.objects.filter(onboarding=tenant.onboarding_record, event_type="tenant_updated").exists()


@pytest.mark.django_db
def test_stg_e2e_0105_provisioned_admin_has_one_active_membership_primary_role_and_login(platform_client):
    created = platform_client.post("/api/v1/platform/tenants/", tenant_payload("stg0d-0105"), format="json")
    tenant = Tenant.objects.get(id=created.json()["id"])
    contact_response = platform_client.post(
        f"/api/v1/platform/tenants/{tenant.id}/admin-contacts/",
        {
            "full_name": "STG0D Tenant Admin",
            "email": "tenant.admin.0105@playwright.qa.invalid",
            "job_title": "Tenant Admin",
            "is_primary": True,
        },
        format="json",
    )
    provision = platform_client.post(
        f"/api/v1/platform/admin-contacts/{contact_response.json()['id']}/provision-user/",
        {
            "username": "stg0d.tenant.admin",
            "role_code": "tenant-admin",
            "role_name": "Tenant Admin",
            "password": PASSWORD,
            "must_change_password": False,
            "membership_status": "active",
        },
        format="json",
    )

    assert provision.status_code == 200, provision.json()
    membership = TenantMembership.objects.get(id=provision.json()["membership_id"])
    assert membership.tenant_id == tenant.id and membership.status == "active" and membership.is_default is True
    role_link = MembershipRole.objects.get(membership=membership, is_primary=True)
    assert role_link.role.code == "tenant-admin"
    assert TenantOnboardingEvent.objects.filter(onboarding=tenant.onboarding_record, event_type="first_admin_provisioned").exists()
    login_client = APIClient()
    login = login_client.post(
        "/api/v1/auth/login/",
        {"identifier": "stg0d.tenant.admin", "password": PASSWORD},
        format="json",
    )
    assert login.status_code == 200, login.json()


@pytest.mark.django_db
def test_stg_e2e_0106_non_platform_identity_cannot_list_or_create_tenants(platform_client):
    baseline = platform_client.post("/api/v1/platform/tenants/", tenant_payload("stg0d-0106-baseline"), format="json")
    tenant_count = Tenant.objects.count()
    user = User.objects.create_user(
        username="stg0d.nonplatform",
        email="nonplatform@playwright.qa.invalid",
        password=PASSWORD,
        is_staff=False,
        is_superuser=False,
    )
    client = APIClient()
    client.force_authenticate(user=user)

    listed = client.get("/api/v1/platform/tenants/")
    created = client.post("/api/v1/platform/tenants/", tenant_payload("stg0d-0106-denied"), format="json")

    assert baseline.status_code == 201
    assert listed.status_code == 403
    assert created.status_code == 403
    assert Tenant.objects.count() == tenant_count
    assert not Tenant.objects.filter(code="stg0d-0106-denied").exists()
