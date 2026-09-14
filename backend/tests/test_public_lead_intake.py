import pytest
from django.contrib.auth import get_user_model
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from apps.tenant_onboarding.models import PublicLeadStatus, PublicTenantLead
from apps.tenants.models import Tenant, TenantOnboardingStatus, TenantStatus


@pytest.mark.django_db
def test_public_lead_create_is_unauthenticated_and_reviewable_by_platform_admin():
    client = APIClient()

    create_response = client.post(
        "/api/v1/platform/public-leads/",
        {
            "intent": "signup",
            "company_name": "Acme Payroll Services",
            "contact_name": "Priya Sharma",
            "work_email": "PRIYA@ACME.EXAMPLE",
            "phone_number": "+91 90000 00000",
            "employee_count": 120,
            "industry": "Services",
            "country_code": "IN",
            "preferred_plan": "growth",
            "message": "We want a guided payroll pilot.",
            "source_path": "/",
        },
        format="json",
    )

    assert create_response.status_code == 201, create_response.json()
    lead = PublicTenantLead.objects.get()
    assert lead.work_email == "priya@acme.example"
    assert lead.status == PublicLeadStatus.NEW
    assert lead.employee_count == 120

    list_response = client.get("/api/v1/platform/leads/")
    assert list_response.status_code in {401, 403}

    user = get_user_model().objects.create_superuser(
        username="platform.qa",
        email="platform.qa@example.test",
        password="Password@123",
    )
    token = Token.objects.create(user=user)
    client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")

    list_response = client.get("/api/v1/platform/leads/")
    assert list_response.status_code == 200, list_response.json()
    assert list_response.json()[0]["company_name"] == "Acme Payroll Services"

    patch_response = client.patch(
        f"/api/v1/platform/leads/{lead.id}/",
        {"status": "qualified"},
        format="json",
    )
    assert patch_response.status_code == 200, patch_response.json()
    lead.refresh_from_db()
    assert lead.status == PublicLeadStatus.QUALIFIED
    assert lead.reviewed_by_identifier == "platform.qa"


@pytest.mark.django_db
def test_platform_admin_can_convert_public_lead_to_tenant_and_primary_contact():
    client = APIClient()
    user = get_user_model().objects.create_superuser(
        username="platform.qa",
        email="platform.qa@example.test",
        password="Password@123",
    )
    token = Token.objects.create(user=user)
    client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")
    lead = PublicTenantLead.objects.create(
        intent="signup",
        company_name="Nova Payroll Labs",
        contact_name="Meera Iyer",
        work_email="meera@nova-payroll.test",
        phone_number="+91 90000 11111",
        employee_count=140,
        industry="Technology",
        country_code="IN",
        preferred_plan="growth",
        message="We need a launch pilot.",
    )

    response = client.post(
        f"/api/v1/platform/leads/{lead.id}/convert/",
        {
            "code": "nova-payroll-labs",
            "primary_domain": "nova-payroll.test",
            "subscription_plan": "growth",
            "seed_pack": "standard_office",
            "is_sandbox": True,
            "setup_style": "platform_assisted",
            "data_setup_style": "manual",
            "policy_control_style": "mixed",
            "admin_job_title": "Head of People",
            "notes": "Commercial approval received.",
        },
        format="json",
    )

    assert response.status_code == 201, response.json()
    lead.refresh_from_db()
    tenant = Tenant.objects.get(code="nova-payroll-labs")
    onboarding = tenant.onboarding_record
    contact = onboarding.admin_contacts.get()

    assert lead.status == PublicLeadStatus.CONVERTED
    assert lead.converted_tenant == tenant
    assert tenant.status == TenantStatus.DRAFT
    assert tenant.onboarding_status == TenantOnboardingStatus.CREATED
    assert tenant.primary_email == "meera@nova-payroll.test"
    assert tenant.domains.get(is_primary=True).domain == "nova-payroll.test"
    assert onboarding.industry_context == "Technology"
    assert onboarding.notes == "Commercial approval received."
    assert contact.email == "meera@nova-payroll.test"
    assert contact.full_name == "Meera Iyer"
    assert contact.is_primary is True
    assert onboarding.events.filter(event_type="public_lead_converted").exists()

    duplicate_response = client.post(
        f"/api/v1/platform/leads/{lead.id}/convert/",
        {"code": "nova-payroll-labs-2"},
        format="json",
    )
    assert duplicate_response.status_code == 400
